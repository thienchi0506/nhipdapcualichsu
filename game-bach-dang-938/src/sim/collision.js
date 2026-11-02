import { hullPoints } from './river.js';

function collisionRadius(config, vessel) {
  const length = vessel.lengthM - vessel.widthM;
  const count = Math.max(1, Math.ceil(length / config.collision.collisionSampleSpacingM));
  // Inflate the sampled discs just enough to conservatively cover the capsule
  // between spine samples, so a thin stake cannot slip through a sampling gap.
  return Math.hypot(vessel.widthM / 2, length / count / 2);
}

export function sweepCircle(from, to, obstacle, radius) {
  const px = from.x - obstacle.x, pz = from.z - obstacle.z;
  const dx = to.x - from.x, dz = to.z - from.z;
  const combined = radius + obstacle.radiusM;
  const c = px * px + pz * pz - combined * combined;
  const a = dx * dx + dz * dz;
  if (a < 1e-16) return null;
  let t;
  if (c <= 0) {
    const dot = px * dx + pz * dz;
    if (dot >= 0 && px * px + pz * pz > 1e-12) return null; // separating contact
    t = 0;
  } else {
    const b = 2 * (px * dx + pz * dz);
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;
    t = (-b - Math.sqrt(discriminant)) / (2 * a);
    if (t < 0 || t > 1) return null;
  }
  let nx = px + dx * t, nz = pz + dz * t;
  const distance = Math.hypot(nx, nz);
  if (distance > 1e-8) { nx /= distance; nz /= distance; }
  else { const speed = Math.sqrt(a); nx = -dx / speed; nz = -dz / speed; }
  return { t, nx, nz, obstacle, along: from.along };
}

export function firstCollision(config, vessel, from, to, obstacles) {
  const a = hullPoints(vessel, from, config.collision.collisionSampleSpacingM);
  const b = hullPoints(vessel, to, config.collision.collisionSampleSpacingM);
  let first = null;
  for (let i = 0; i < a.length; i++) for (const obstacle of obstacles) {
    const contact = sweepCircle(a[i], b[i], obstacle, collisionRadius(config, vessel));
    if (contact && (!first || contact.t < first.t || (contact.t === first.t && obstacle.id < first.obstacle.id))) first = contact;
  }
  return first;
}

export function overlapping(config, vessel, pose, obstacle, margin = 0) {
  const radius = collisionRadius(config, vessel) + obstacle.radiusM + margin;
  return hullPoints(vessel, pose, config.collision.collisionSampleSpacingM).some(p => Math.hypot(p.x - obstacle.x, p.z - obstacle.z) <= radius);
}
