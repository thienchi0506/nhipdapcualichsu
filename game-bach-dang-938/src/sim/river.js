export const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function tideAt(config, seconds) {
  const keys = config.tideKeys;
  if (seconds <= keys[0][0]) return { level: keys[0][1], rate: (keys[1][1] - keys[0][1]) / (keys[1][0] - keys[0][0]) };
  for (let i = 1; i < keys.length; i++) {
    const [t1, y1] = keys[i], [t0, y0] = keys[i - 1];
    if (seconds <= t1) return { level: y0 + (y1 - y0) * (seconds - t0) / (t1 - t0), rate: (y1 - y0) / (t1 - t0) };
  }
  return { level: keys.at(-1)[1], rate: 0 };
}

export function bedAt(config, x, z) {
  const map = config.map;
  const bankFactor = clamp((Math.abs(x) - map.bankStartX) / (map.halfWidthM - map.bankStartX), 0, 1);
  const endFactor = clamp((Math.abs(z) - map.halfLengthM + 3) / 3, 0, 1);
  let height = map.deepBedY + (map.bankTopY - map.deepBedY) * Math.max(bankFactor, endFactor);
  for (const shoal of map.shoals) {
    const distance = Math.max(shoal.xMin - x, x - shoal.xMax, shoal.zMin - z, z - shoal.zMax, 0);
    const factor = clamp(1 - distance / shoal.slopeM, 0, 1);
    height = Math.max(height, map.deepBedY + (shoal.bedY - map.deepBedY) * factor);
  }
  return height;
}

export function currentAt(config, x, z, tideRate) {
  const c = config.current;
  // A small deterministic eddy; not a fluid solver or real hydrographic data.
  let vx = c.xMps + Math.sin(z * 0.05) * c.eddyStrengthMps;
  let vz = c.zMps + Math.sin(x * 0.1) * c.eddyStrengthMps;
  if (tideRate > 0) { vx = -vx; vz = -vz; }
  const length = Math.hypot(vx, vz);
  const factor = length > c.maxMps ? c.maxMps / length : 1;
  return { x: vx * factor, z: vz * factor };
}

export function draftOf(config, state) {
  const vessel = config.vessels[state.vesselType];
  return vessel.baseDraftM + (vessel.crewMassKg + state.cargoKg + state.floodKg) / (config.densityKgM3 * vessel.waterplaneAreaM2);
}

export function hullPoints(vessel, pose, spacing = 0.5) {
  const halfSpine = (vessel.lengthM - vessel.widthM) / 2;
  const count = Math.max(1, Math.ceil(halfSpine * 2 / spacing));
  const sin = Math.sin(pose.yaw), cos = Math.cos(pose.yaw);
  const points = [];
  for (let i = 0; i <= count; i++) {
    const along = -halfSpine + 2 * halfSpine * i / count;
    points.push({ x: pose.x + sin * along, z: pose.z + cos * along, along });
  }
  return points;
}

export function maximumBed(config, vessel, pose) {
  let highestBed = -Infinity;
  const radius = vessel.widthM / 2;
  const sideX = Math.cos(pose.yaw) * radius, sideZ = -Math.sin(pose.yaw) * radius;
  const points = hullPoints(vessel, pose, config.collision.collisionSampleSpacingM);
  for (const p of points) {
    highestBed = Math.max(highestBed, bedAt(config, p.x, p.z), bedAt(config, p.x + sideX, p.z + sideZ), bedAt(config, p.x - sideX, p.z - sideZ));
  }
  for (const end of [points[0], points.at(-1)]) for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    highestBed = Math.max(highestBed, bedAt(config, end.x + Math.cos(angle) * radius, end.z + Math.sin(angle) * radius));
  }
  return highestBed;
}

export function minimumDepth(config, vessel, pose, waterY) {
  return Math.max(0, waterY - maximumBed(config, vessel, pose));
}

export function validateRiverConfig(config) {
  if (config?.version !== 'bd938-river-lab-1' || config.tickHz !== 30) throw new Error('Cấu hình mô phỏng sông không đúng phiên bản.');
  if (!Number.isInteger(config.maxCatchUpTicks) || config.maxCatchUpTicks < 1) throw new Error('Nhịp mô phỏng không hợp lệ.');
  if (!(config.hudHz > 0) || config.tickHz % config.hudHz !== 0 || !(config.componentMax > 0)) throw new Error('Nhịp thông tin hoặc bộ phận thuyền không hợp lệ.');
  if (config.tideKeys.length < 2 || config.tideKeys.some((key, i, keys) => key.length !== 2 || key.some(v => !Number.isFinite(v)) || (i > 0 && key[0] <= keys[i - 1][0]))) throw new Error('Mốc thủy triều không hợp lệ.');
  if (new Set(config.map.stakes.map(stake => stake.id)).size !== config.map.stakes.length) throw new Error('ID cọc bị trùng.');
  if (!(config.map.halfWidthM > config.map.bankStartX) || !(config.map.halfLengthM > 0)) throw new Error('Kích thước sông không hợp lệ.');
  if (!(config.collision.collisionSampleSpacingM > 0) || !(config.collision.maxPointTravelM > 0) || !(config.repair.workS > 0) || !(config.recovery.workS > 0)) throw new Error('Khoảng va chạm hoặc thời gian công việc không hợp lệ.');
  if (!Number.isInteger(config.groundSolveIterations) || config.groundSolveIterations < 1 || config.groundSolveIterations > 64) throw new Error('Độ chính xác tiếp xúc đáy không hợp lệ.');
  for (const stake of config.map.stakes) if (!stake.id || ![stake.x, stake.z, stake.tipY, stake.radiusM].every(Number.isFinite) || !(stake.radiusM > 0)) throw new Error('Tọa độ cọc không hợp lệ.');
  for (const vessel of Object.values(config.vessels)) {
    for (const key of ['emptyMassKg', 'waterplaneAreaM2', 'lengthM', 'widthM', 'maxForwardMps', 'responsePerS']) if (!Number.isFinite(vessel[key]) || !(vessel[key] > 0)) throw new Error(`Thông số thuyền không hợp lệ: ${key}`);
    if (vessel.lengthM < vessel.widthM || ![vessel.cargoKg, vessel.crewMassKg].every(v => Number.isFinite(v) && v >= 0)) throw new Error('Tải hoặc kích thước thân thuyền không hợp lệ.');
  }
  return config;
}
