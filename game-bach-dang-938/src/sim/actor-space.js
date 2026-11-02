import { bedAt, clamp } from './river.js';

export function localToWorld(boat, x, z) { const s = Math.sin(boat.yaw), c = Math.cos(boat.yaw); return { x: boat.x + c * x + s * z, z: boat.z - s * x + c * z }; }
export function worldToLocal(boat, x, z) { const dx = x - boat.x, dz = z - boat.z, s = Math.sin(boat.yaw), c = Math.cos(boat.yaw); return { x: c * dx - s * dz, z: s * dx + c * dz }; }
export function boatList(world, river, config) {
  const v = river.config.vessels[river.vesselType];
  const y = Math.max(river.readings.waterY - river.readings.draft + river.liftM, river.readings.bedY);
  const own = { id: 'player-boat', x: river.x, z: river.z, yaw: river.yaw, y, deckY: y + 1.025 * (river.vesselType === 'transport' ? 1.2 : 1), width: v.widthM * 2.4 / 2.8, length: v.lengthM * 6.6 / 7, vx: river.vx, vz: river.vz, friendly: true };
  const result = [own];
  if (world.enemyBoat) {
    const e = world.enemyBoat;
    result.push({ ...e, y: river.readings.waterY - config.enemyBoat.draftM, deckY: river.readings.waterY - config.enemyBoat.draftM + 1.025, friendly: false });
  }
  return result;
}
export function insideDeck(boat, x, z, inset = 0) { const p = worldToLocal(boat, x, z); return Math.abs(p.x) <= boat.width / 2 - inset && Math.abs(p.z) <= boat.length / 2 - inset; }
export function closestDeckPoint(boat, x, z, inset = 0.3) { const p = worldToLocal(boat, x, z); return localToWorld(boat, clamp(p.x, -boat.width / 2 + inset, boat.width / 2 - inset), clamp(p.z, -boat.length / 2 + inset, boat.length / 2 - inset)); }
export function supportAt(world, river, config, x, z) {
  const surfaces = [];
  for (const boat of boatList(world, river, config)) if (insideDeck(boat, x, z)) surfaces.push({ kind: 'deck', boatId: boat.id, y: boat.deckY });
  const pier = config.pier;
  if (x >= pier.xMin && x <= pier.xMax && z >= pier.zMin && z <= pier.zMax) surfaces.push({ kind: 'pier', y: pier.y });
  const bed = bedAt(river.config, x, z);
  if (bed >= river.readings.waterY - config.wadeDepthM) surfaces.push({ kind: 'ground', y: bed });
  return surfaces.sort((a, b) => b.y - a.y);
}
export function attach(actor, surface, world, river, config, x = actor.x, z = actor.z) {
  actor.mode = 'foot'; actor.x = x; actor.z = z; actor.y = surface.y; actor.vx = 0; actor.vz = 0; actor.vy = 0;
  actor.attachment = { kind: surface.kind, boatId: surface.boatId || null };
  if (surface.kind === 'deck') {
    const boat = boatList(world, river, config).find(b => b.id === surface.boatId);
    const p = worldToLocal(boat, x, z); actor.attachment.localX = p.x; actor.attachment.localZ = p.z;
  }
}
export function syncAttachment(actor, world, river, config) {
  if (actor.attachment?.kind !== 'deck') return;
  const boat = boatList(world, river, config).find(b => b.id === actor.attachment.boatId);
  if (!boat) return;
  const p = localToWorld(boat, actor.attachment.localX, actor.attachment.localZ);
  actor.x = p.x; actor.z = p.z; actor.y = boat.deckY;
}
export function segmentBox(a, b, min, max) {
  let lo = 0, hi = 1;
  for (const axis of ['x', 'y', 'z']) {
    const d = b[axis] - a[axis];
    if (Math.abs(d) < 1e-9) { if (a[axis] < min[axis] || a[axis] > max[axis]) return null; }
    else { const t1 = (min[axis] - a[axis]) / d, t2 = (max[axis] - a[axis]) / d; lo = Math.max(lo, Math.min(t1, t2)); hi = Math.min(hi, Math.max(t1, t2)); if (lo > hi) return null; }
  }
  return lo;
}
