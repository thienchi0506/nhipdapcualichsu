import { clamp, tideAt, currentAt, draftOf, minimumDepth, maximumBed } from './river.js';
import { firstCollision, overlapping } from './collision.js';

const parts = ['hull', 'rudder', 'oars', 'rigging'];
const partNames = { hull: 'thân thuyền', rudder: 'bánh lái', oars: 'mái chèo', rigging: 'dây giằng' };

function emit(state, type, payload = {}) {
  const event = { id: `river:${state.tick}:${++state.eventSequence}`, tick: state.tick, type, ...payload };
  state.events.push(event);
  if(state.journalPending)state.journalPending.push(event);
  if (state.events.length > 128) state.events.shift();
  state.eventCounts[type] = (state.eventCounts[type] || 0) + 1;
  return event;
}
function message(state, text) { state.message = text; state.messageUntilTick = state.tick + state.config.tickHz * state.config.messageDurationS; }

export function createRiverState(config, { heroId = 'H01', vesselType = 'light', scenarioId = 'harbor' } = {}) {
  if (!config.vessels[vesselType] || !config.scenarios[scenarioId]) throw new Error('Thuyền hoặc tình huống mô phỏng không hợp lệ.');
  const scenario = config.scenarios[scenarioId], vessel = config.vessels[vesselType];
  const state = {
    config, heroId, vesselType, scenarioId, tick: 0, timeOffsetS: scenario.timeOffsetS,
    x: scenario.x, z: scenario.z, yaw: scenario.yaw, vx: 0, vz: 0, yawRate: 0,
    cargoKg: vessel.cargoKg, floodKg: 0, discardedKg: 0,
    components: { hull: config.componentMax, rudder: config.componentMax, oars: config.componentMax, rigging: config.componentMax, ...scenario.components },
    anchor: !!scenario.anchor, pumping: false, recovering: false, repairJob: null, stuck: null,
    timber: config.repair.initialTimber, contacts: {}, commands: [],
    events: [], eventSequence: 0, eventCounts: {}, message: '', messageUntilTick: 0,
    readings: null, warnings: [], liftM: 0,
  };
  updateReadings(state); return state;
}

function environment(state, pose = state) {
  const c = state.config, vessel = c.vessels[state.vesselType];
  const tide = tideAt(c, state.timeOffsetS + state.tick / c.tickHz);
  const draft = draftOf(c, state);
  const bedY = maximumBed(c, vessel, pose);
  const depth = Math.max(0, tide.level - bedY);
  return { waterY: tide.level, tideRate: tide.rate, draft, bedY, depth, clearance: depth - draft, current: currentAt(c, pose.x, pose.z, tide.rate) };
}

export function updateReadings(state) {
  const e = environment(state), c = state.config, vessel = c.vessels[state.vesselType];
  state.readings = { ...e, speedMps: Math.hypot(state.vx, state.vz), inRepairZone: Math.hypot(state.x - c.repair.zoneX, state.z - c.repair.zoneZ) <= c.repair.zoneRadiusM, massKg: vessel.emptyMassKg + vessel.crewMassKg + state.cargoKg + state.floodKg };
  const warnings = [];
  if (state.stuck) warnings.push(state.stuck.kind === 'stake' ? 'MẮC CỌC — dừng máy, gỡ mắc hoặc chờ nước lên; giảm tải giúp nổi cao hơn.' : 'MẮC CẠN — lùi về nước sâu, gỡ mắc hoặc giảm tải.');
  if (state.components.rudder <= 0) warnings.push('MẤT LÁI — thuyền không quay được. Neo và sửa bánh lái tại bến.');
  else if (state.components.rudder < c.warningIntegrity) warnings.push('Bánh lái hỏng — tốc độ quay đã giảm.');
  if (state.components.oars < c.warningIntegrity) warnings.push('Mái chèo hỏng — lực đẩy giảm.');
  if (state.components.hull < c.flood.leakBelowIntegrity) warnings.push('THÂN THUYỀN RÒ — nước vào làm tăng mớn. Bơm nước và sửa thân.');
  if (!state.stuck && e.clearance < c.safeClearanceM) warnings.push('ĐÁY SÁT BÃI CẠN — giảm tốc, đổi hướng ra lòng sông.');
  const speed = state.readings.speedMps;
  const forward = speed > 0.2 ? { x: state.vx / speed, z: state.vz / speed } : { x: -Math.sin(state.yaw), z: -Math.cos(state.yaw) };
  const ahead = { ...state, x: state.x + forward.x * (vessel.lengthM / 2 + Math.max(1, state.readings.speedMps) * c.controls.warningLookaheadS), z: state.z + forward.z * (vessel.lengthM / 2 + Math.max(1, state.readings.speedMps) * c.controls.warningLookaheadS) };
  if (!state.stuck && minimumDepth(c, vessel, ahead, e.waterY) < e.draft + c.safeClearanceM) warnings.push('Vùng cạn theo hướng đang đi — giảm tốc và vòng ra luồng sâu.');
  if (c.map.stakes.some(stake => Math.hypot(stake.x - state.x, stake.z - state.z) < c.controls.stakeWarningRadiusM)) warnings.push(e.waterY - e.draft > Math.max(...c.map.stakes.map(s => s.tipY)) + c.safeClearanceM ? 'Bãi cọc đã biết ở gần — hiện còn đủ nước, chú ý triều rút.' : 'NGUY HIỂM: cọc tới đáy thuyền, kể cả khi chưa nhô khỏi mặt nước.');
  if (state.anchor) warnings.push('Đang neo — nhả neo trước khi di chuyển.');
  if (state.messageUntilTick >= state.tick && state.message) warnings.unshift(state.message);
  state.warnings = warnings;
}

function applyAction(state, action) {
  if (!action.id || state.commands.includes(action.id)) return;
  state.commands.push(action.id);
  const c = state.config;
  if (action.type === 'anchor') { state.anchor = !state.anchor; emit(state, 'AnchorChanged', { anchored: state.anchor }); }
  else if (action.type === 'pump') { state.pumping = !state.pumping; emit(state, 'PumpChanged', { pumping: state.pumping }); }
  else if (action.type === 'unload') {
    const amount = Math.min(c.controls.unloadKg, state.cargoKg);
    state.cargoKg -= amount; state.discardedKg += amount;
    emit(state, 'CargoDiscarded', { amountKg: amount }); message(state, amount > 0 ? `Đã bỏ ${amount} kg hàng để giảm mớn. Hàng không tự quay lại trong lượt thử.` : 'Không còn hàng để bỏ; không bỏ quân hoặc mái chèo.');
  } else if (action.type === 'recover') {
    if (!state.stuck) { message(state, 'Thuyền chưa mắc.'); return; }
    state.recovering = !state.recovering;
    if (state.recovering) state.anchor = false;
    emit(state, 'RecoveryChanged', { active: state.recovering });
  } else if (action.type === 'repair') {
    if (state.repairJob) { state.repairJob = null; message(state, 'Đã dừng sửa; chưa trừ thêm gỗ.'); return; }
    const target = parts.filter(part => state.components[part] < c.componentMax).sort((a, b) => state.components[a] - state.components[b] || parts.indexOf(a) - parts.indexOf(b))[0];
    if (!state.readings.inRepairZone) { message(state, 'Cần trở lại vùng bến sửa có vòng màu xanh.'); return; }
    if (!target) { message(state, 'Các bộ phận còn nguyên vẹn.'); return; }
    if (state.timber < c.repair.timberPerJob) { message(state, 'Không đủ gỗ sửa trong lượt thử này.'); return; }
    state.anchor = true;
    state.repairJob = { id: `repair:${action.id}`, target, workS: 0 };
    emit(state, 'RepairStarted', { jobId: state.repairJob.id, component: target });
  }
}

function hit(state, hit, approachSpeed, penetration = 0, settling = false) {
  const c = state.config, obstacle = hit.obstacle;
  const existing = !!state.contacts[obstacle.id];
  if (!existing) state.contacts[obstacle.id] = { episode: state.eventSequence + 1 };
  const kineticKJ = 0.5 * state.readings.massKg * approachSpeed * approachSpeed / 1000;
  const damage = clamp((approachSpeed >= c.collision.minimumDamagingSpeedMps ? kineticKJ * c.collision.damagePerKJ : 0) + (settling ? Math.max(0, penetration) * c.collision.settlingDamagePerM : 0), 0, c.collision.maxImpactDamage);
  const side = Math.abs(hit.nx * Math.cos(state.yaw) - hit.nz * Math.sin(state.yaw));
  const secondary = side > c.collision.sideHitDotThreshold ? 'oars' : hit.along > 0 ? 'rudder' : 'rigging';
  if (!existing) {
    state.components.hull = Math.max(0, state.components.hull - damage * c.collision.hullDamageFraction);
    state.components[secondary] = Math.max(0, state.components[secondary] - damage * (1 - c.collision.hullDamageFraction));
    emit(state, obstacle.kind === 'stake' ? 'StakeImpact' : 'SolidImpact', { obstacleId: obstacle.id, damage, approachSpeed, penetration, secondary, settling });
  }
  if (!state.stuck && obstacle.kind === 'stake' && (settling || approachSpeed >= c.collision.embedMinSpeedMps || penetration >= c.collision.embedMinPenetrationM)) {
    state.stuck = { kind: 'stake', obstacleId: obstacle.id, nx: hit.nx, nz: hit.nz, workS: 0, distanceM: 0 };
    state.vx = 0; state.vz = 0; state.yawRate = 0;
    emit(state, 'Stuck', { kind: 'stake', obstacleId: obstacle.id });
  }
}

function release(state, reason) {
  emit(state, 'Freed', { kind: state.stuck.kind, reason });
  state.stuck = null; state.recovering = false; state.liftM = 0;
}

function depthDirection(state) {
  const c = state.config, vessel = c.vessels[state.vesselType], h = c.collision.maxPointTravelM;
  const water = state.readings.waterY;
  const dx = minimumDepth(c, vessel, { ...state, x: state.x + h }, water) - minimumDepth(c, vessel, { ...state, x: state.x - h }, water);
  const dz = minimumDepth(c, vessel, { ...state, z: state.z + h }, water) - minimumDepth(c, vessel, { ...state, z: state.z - h }, water);
  const length = Math.hypot(dx, dz);
  return length > 1e-8 ? { x: dx / length, z: dz / length } : { x: Math.sin(state.yaw), z: Math.cos(state.yaw) };
}

function ground(state) {
  if (state.stuck) return;
  const n = depthDirection(state);
  state.stuck = { kind: 'ground', nx: n.x, nz: n.z, workS: 0, distanceM: 0 };
  state.vx = 0; state.vz = 0; state.yawRate = 0;
  emit(state, 'Grounded');
}

export function stepRiver(state, intent = {}, dynamicObstacles = []) {
  const c = state.config, vessel = c.vessels[state.vesselType], dt = 1 / c.tickHz;
  state.tick++;
  state.liftM = 0;
  for (const action of intent.actions || []) applyAction(state, action);
  const leak = Math.max(0, c.flood.leakBelowIntegrity - state.components.hull) / c.flood.leakBelowIntegrity * c.flood.maxLeakKgps;
  state.floodKg = Math.max(0, state.floodKg + (leak - (state.pumping ? c.flood.pumpKgps : 0)) * dt);
  updateReadings(state);
  const e = state.readings;
  const staticObstacles = [...dynamicObstacles, ...c.map.obstacles.map(o => ({ ...o, kind: 'solid' })), ...c.map.mooredBoats.flatMap(boat => [-2, 0, 2].map((offset, i) => ({ id: `${boat.id}:${i}`, x: boat.x, z: boat.z + offset, radiusM: 1.4, kind: 'solid' })))];
  const stakes = c.map.stakes.map(stake => ({ ...stake, kind: 'stake' }));
  const all = [...staticObstacles, ...stakes];
  for (const id of Object.keys(state.contacts)) {
    const object = all.find(o => o.id === id);
    if (!object || !overlapping(c, vessel, state, object, c.collision.contactReleaseMarginM) || (object.kind === 'stake' && e.waterY - e.draft > object.tipY + c.collision.verticalReleaseM)) delete state.contacts[id];
  }
  if (state.stuck) {
    const noStakesBelow = !stakes.some(s => overlapping(c, vessel, state, s, c.collision.contactReleaseMarginM) && e.waterY - e.draft <= s.tipY + c.collision.verticalReleaseM);
    if ((state.stuck.kind === 'stake' && noStakesBelow) || (state.stuck.kind === 'ground' && e.clearance >= c.safeClearanceM)) release(state, 'float');
  }
  if (!state.stuck && e.clearance < -c.collision.epsilonM) ground(state);
  let pulling = false;
  if (state.stuck && state.recovering) {
    const penetration = state.stuck.kind === 'ground' ? -e.clearance : Math.max(0, ...stakes.filter(s => overlapping(c, vessel, state, s)).map(s => s.tipY - (e.waterY - e.draft)));
    if (state.components.oars < c.recovery.minimumOars) message(state, 'Mái chèo quá hỏng để hỗ trợ gỡ. Cần sửa hoặc chờ nước lên.');
    else if (penetration > c.recovery.maxPullPenetrationM && state.stuck.workS < c.recovery.workS) message(state, 'Kẹt quá sâu để gỡ. Giảm tải, bơm nước hoặc chờ triều lên.');
    else {
      state.stuck.workS = Math.min(c.recovery.workS, state.stuck.workS + dt);
      if (state.stuck.workS >= c.recovery.workS && state.stuck.distanceM < c.recovery.maxPullDistanceM) {
        const massFactor = vessel.emptyMassKg / e.massKg;
        state.liftM = state.stuck.kind === 'stake' ? c.recovery.liftM * massFactor : 0;
        if (state.stuck.kind === 'ground' || penetration <= state.liftM) {
          pulling = true;
          // Controlled backing away, not teleportation or an invulnerability button.
          const n = state.stuck.kind === 'ground' ? depthDirection(state) : { x: Math.sin(state.yaw), z: Math.cos(state.yaw) };
          state.vx = n.x * c.recovery.pullMps; state.vz = n.z * c.recovery.pullMps;
        } else message(state, 'Lực kê không đủ khi nước tiếp tục rút. Giảm tải hoặc chờ nước lên.');
      }
    }
  }
  if (state.stuck && !pulling) { state.vx = 0; state.vz = 0; state.yawRate = 0; }
  else if (!pulling) {
    const anchoredVx = state.vx, anchoredVz = state.vz, anchoredYaw = state.yawRate;
    const fx = -Math.sin(state.yaw), fz = -Math.cos(state.yaw), sx = Math.cos(state.yaw), sz = -Math.sin(state.yaw);
    const rx = state.vx - e.current.x, rz = state.vz - e.current.z;
    const relativeForward = rx * fx + rz * fz, relativeSide = rx * sx + rz * sz;
    const propulsion = state.components.oars / c.componentMax * (state.pumping ? c.controls.pumpPropulsionFactor : 1);
    const throttle = state.anchor ? 0 : Number.isFinite(intent.throttle) ? clamp(intent.throttle, -1, 1) : Number(!!intent.forward) - Number(!!intent.back);
    const target = throttle * (throttle >= 0 ? vessel.maxForwardMps : vessel.maxReverseMps) * propulsion;
    const massFactor = vessel.emptyMassKg / e.massKg;
    const drag = 1 + (1 - state.components.rigging / c.componentMax) * c.controls.riggingDragFactor;
    const acceleration = clamp((target - relativeForward * drag) * vessel.responsePerS * massFactor, -vessel.maxAccelerationMps2, vessel.maxAccelerationMps2);
    state.vx += (fx * acceleration - sx * relativeSide * vessel.sideDragPerS * massFactor) * dt;
    state.vz += (fz * acceleration - sz * relativeSide * vessel.sideDragPerS * massFactor) * dt;
    const turn = state.anchor ? 0 : Number.isFinite(intent.turn) ? clamp(intent.turn, -1, 1) : Number(!!intent.left) - Number(!!intent.right);
    const targetYaw = turn * vessel.maxYawRadps * (state.components.rudder / c.componentMax) * (c.controls.minimumTurnFraction + (1 - c.controls.minimumTurnFraction) * Math.min(1, Math.abs(relativeForward) / vessel.maxForwardMps));
    state.yawRate += (targetYaw - state.yawRate) * Math.min(1, vessel.yawResponsePerS * dt);
    if (state.anchor) {
      const retention = Math.exp(-c.controls.anchorDragPerS * dt);
      // The tether balances steady current; damp existing inertia, not a fresh
      // current impulse on every tick (which would slowly drag a set anchor).
      state.vx = anchoredVx * retention; state.vz = anchoredVz * retention; state.yawRate = anchoredYaw * retention;
      if (Math.hypot(state.vx, state.vz) < c.controls.anchorStopMps) { state.vx = 0; state.vz = 0; }
    }
  }
  const travel = Math.hypot(state.vx, state.vz) * dt + vessel.lengthM / 2 * Math.abs(state.yawRate) * dt;
  const substeps = Math.max(1, Math.min(c.collision.maxSubsteps, Math.ceil(travel / c.collision.maxPointTravelM)));
  const subDt = dt / substeps;
  const obstacles = [...staticObstacles, ...stakes.filter(stake => stake.tipY - (e.waterY - e.draft + state.liftM) >= c.collision.stakePenetrationMinM)];
  if (!state.stuck || pulling) for (let i = 0; i < substeps; i++) {
    const from = { x: state.x, z: state.z, yaw: state.yaw };
    const to = { x: state.x + state.vx * subDt, z: state.z + state.vz * subDt, yaw: state.yaw + state.yawRate * subDt };
    const oldDepth = minimumDepth(c, vessel, from, e.waterY), nextDepth = minimumDepth(c, vessel, to, e.waterY);
    if (nextDepth < e.draft - c.collision.epsilonM && nextDepth < oldDepth - c.collision.epsilonM) {
      if (!state.stuck && oldDepth >= e.draft) {
        let low = 0, high = 1;
        for (let j = 0; j < c.groundSolveIterations; j++) {
          const t = (low + high) / 2;
          const pose = { x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t, yaw: from.yaw + (to.yaw - from.yaw) * t };
          if (minimumDepth(c, vessel, pose, e.waterY) >= e.draft) low = t; else high = t;
        }
        state.x = from.x + (to.x - from.x) * low; state.z = from.z + (to.z - from.z) * low; state.yaw = from.yaw + (to.yaw - from.yaw) * low;
      }
      ground(state); break;
    }
    const contact = firstCollision(c, vessel, from, to, obstacles);
    if (contact) {
      const factor = Math.max(0, contact.t - c.collision.epsilonM / Math.max(1e-8, Math.hypot(to.x - from.x, to.z - from.z) + vessel.lengthM * Math.abs(to.yaw - from.yaw)));
      state.x += (to.x - from.x) * factor; state.z += (to.z - from.z) * factor; state.yaw += (to.yaw - from.yaw) * factor;
      const angularX = Math.cos(state.yaw) * contact.along * state.yawRate, angularZ = -Math.sin(state.yaw) * contact.along * state.yawRate;
      const approach = Math.max(0, -(state.vx + angularX) * contact.nx - (state.vz + angularZ) * contact.nz);
      const penetration = contact.obstacle.kind === 'stake' ? contact.obstacle.tipY - (e.waterY - e.draft) : 0;
      hit(state, contact, approach, penetration);
      const vn = state.vx * contact.nx + state.vz * contact.nz;
      if (vn < 0) { state.vx -= (1 + c.collision.restitution) * vn * contact.nx; state.vz -= (1 + c.collision.restitution) * vn * contact.nz; }
      state.vx *= c.collision.tangentRetention; state.vz *= c.collision.tangentRetention; state.yawRate = 0;
      break;
    }
    state.x = to.x; state.z = to.z; state.yaw = to.yaw;
    if (pulling) state.stuck.distanceM += Math.hypot(to.x - from.x, to.z - from.z);
  }
  // A falling water surface can bring a stationary hull down onto hidden stakes.
  for (const stake of stakes) {
    const penetration = stake.tipY - (e.waterY - e.draft + state.liftM);
    if (penetration >= c.collision.stakePenetrationMinM && overlapping(c, vessel, state, stake)) {
      hit(state, { obstacle: stake, nx: Math.sin(state.yaw), nz: Math.cos(state.yaw), along: 0 }, 0, penetration, true);
    }
  }
  if (state.stuck && pulling) {
    const stillTrapped = state.stuck.kind === 'ground' ? minimumDepth(c, vessel, state, e.waterY) < e.draft + c.safeClearanceM : stakes.some(s => overlapping(c, vessel, state, s, c.collision.contactReleaseMarginM));
    if (!stillTrapped) release(state, 'crew-work');
  }
  if (state.repairJob) {
    const job = state.repairJob;
    if (state.anchor && e.inRepairZone && Math.hypot(state.vx, state.vz) <= c.repair.maxSpeedMps && !intent.forward && !intent.back) job.workS += dt;
    if (job.workS + 1e-8 >= c.repair.workS && state.timber >= c.repair.timberPerJob) {
      state.timber -= c.repair.timberPerJob;
      state.components[job.target] = Math.min(c.componentMax, state.components[job.target] + c.repair.integrityPerJob);
      emit(state, 'RepairCompleted', { jobId: job.id, component: job.target, timberUsed: c.repair.timberPerJob });
      message(state, `Đã sửa ${partNames[job.target]}, dùng ${c.repair.timberPerJob} gỗ. Nhả neo để đi tiếp.`);
      state.repairJob = null;
    }
  }
  updateReadings(state);
  return state;
}

export function riverSnapshot(state) {
  return { tick: state.tick, x: state.x, z: state.z, yaw: state.yaw, vx: state.vx, vz: state.vz, yawRate: state.yawRate, vesselType: state.vesselType, scenarioId: state.scenarioId, cargoKg: state.cargoKg, floodKg: state.floodKg, timber: state.timber, anchor: state.anchor, pumping: state.pumping, recovering: state.recovering, liftM: state.liftM, components: { ...state.components }, readings: structuredClone(state.readings), stuck: state.stuck ? { ...state.stuck } : null, repairJob: state.repairJob ? { ...state.repairJob } : null, warnings: [...state.warnings], eventCounts: { ...state.eventCounts }, events: state.events.map(e => ({ ...e })) };
}
