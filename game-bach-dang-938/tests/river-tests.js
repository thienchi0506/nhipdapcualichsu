import { createRiverState, stepRiver, riverSnapshot } from '../src/sim/vessel.js';
import { draftOf, tideAt, validateRiverConfig } from '../src/sim/river.js';
import { createFixedClock, frameDelta } from '../src/core/clock.js';

export async function runRiverTests() {
  const base = validateRiverConfig(await (await fetch(new URL('../data/river-config.json', import.meta.url))).json());
  const checks = [], observations = {};
  const check = (name, condition, evidence) => checks.push({ name, passed: !!condition, evidence });
  check('First RAF cannot create a negative elapsed time after start or resume', frameDelta(100, null) === 0 && frameDelta(99, 100) === 0 && frameDelta(110, 100) === 10);
  const invalid = structuredClone(base); invalid.tideKeys[1][0] = invalid.tideKeys[0][0];
  let invalidRejected = false; try { validateRiverConfig(invalid); } catch { invalidRejected = true; }
  check('Malformed tide timeline is rejected before loading a scene', invalidRejected);
  function clean() {
    const c = structuredClone(base);
    c.current = { xMps: 0, zMps: 0, eddyStrengthMps: 0, maxMps: 1.2 };
    c.tideKeys = [[0, 1.4], [1500, 1.4]];
    c.map.bankStartX = 9999; c.map.halfWidthM = 10000; c.map.halfLengthM = 10000;
    c.map.shoals = []; c.map.stakes = []; c.map.obstacles = []; c.map.mooredBoats = [];
    c.scenarios.harbor = { x: 0, z: 0, yaw: 0, timeOffsetS: 0 };
    return c;
  }
  const run = (s, ticks, intent = {}) => { for (let i = 0; i < ticks; i++) stepRiver(s, typeof intent === 'function' ? intent(s.tick) : intent); return s; };
  const action = (s, type, id = type) => stepRiver(s, { actions: [{ id, type }] });
  const state = (c, vesselType = 'light', scenarioId = 'harbor') => createRiverState(c, { vesselType, scenarioId });
  function lowStake() {
    const c = clean(); c.tideKeys = [[0, 0.32], [1500, 0.32]];
    c.map.stakes = [{ id: 'test-stake', x: 0, z: 0, radiusM: 0.13, tipY: 0.05 }]; return c;
  }
  let c = clean(), s = state(c);
  stepRiver(s, { forward: true });
  check('Acceleration is gradual, not instant max speed', s.vz < 0 && Math.abs(s.vz) < c.vessels.light.maxForwardMps / 10, s.vz);
  run(s, 180, { forward: true }); const beforeBrake = Math.abs(s.vz);
  run(s, 30, { back: true });
  check('Reverse command first brakes forward motion', Math.abs(s.vz) < beforeBrake, { beforeBrake, after: Math.abs(s.vz) });
  run(s, 240, { back: true }); check('Boat can reverse', s.vz > 0);
  c = clean(); c.current.xMps = 0.2; c.current.zMps = 0.7; s = state(c); run(s, 600);
  check('Unpowered boat drifts with current', s.x > 1 && s.z > 5 && s.vz > 0.6, { x: s.x, z: s.z, vz: s.vz });
  action(s, 'anchor'); run(s, 300, { forward: true }); const anchorZ = s.z; run(s, 300, { forward: true });
  check('Anchor holds even if forward is held', Math.abs(s.z - anchorZ) < 0.01, s.z - anchorZ);

  c = clean(); c.map.shoals = structuredClone(base.map.shoals);
  c.scenarios.harbor = { x: 10, z: 18, yaw: 0, timeOffsetS: 0 };
  const light = state(c), heavy = state(c, 'transport');
  check('Cargo and hull class increase draft', draftOf(c, heavy) > draftOf(c, light), { light: draftOf(c, light), heavy: draftOf(c, heavy) });
  run(light, 600, { forward: true }); run(heavy, 600, { forward: true });
  check('Light vessel crosses the shallow region', !light.stuck && light.z < -10, riverSnapshot(light));
  check('Loaded transport grounds before crossing same shoal', heavy.stuck?.kind === 'ground' && heavy.z > 10, riverSnapshot(heavy));
  check('Ground contact is resolved at keel clearance zero, not a frame early', Math.abs(heavy.readings.clearance) < c.collision.epsilonM, heavy.readings.clearance);
  action(heavy, 'recover'); run(heavy, 2400);
  check('Grounded transport can be worked backwards into deeper water', !heavy.stuck && heavy.eventCounts.Freed > 0, riverSnapshot(heavy));

  c = lowStake(); c.tideKeys = [[0, 1.4], [10, 0.32], [1500, 0.32]]; s = state(c);
  run(s, 600);
  check('Falling tide catches a stationary hull', s.stuck?.kind === 'stake', riverSnapshot(s));
  check('Stake still submerged when it first impacts the hull', s.events.find(e => e.type === 'StakeImpact')?.tick / c.tickHz < 10 && 0.32 > c.map.stakes[0].tipY);
  const hullAfter = s.components.hull, impactsAfter = s.eventCounts.StakeImpact;
  run(s, 900);
  check('Same contact does not subtract hull damage each frame', s.components.hull === hullAfter && s.eventCounts.StakeImpact === impactsAfter && impactsAfter === 1, { hullAfter, hullNow: s.components.hull, impacts: s.eventCounts.StakeImpact });
  check('Contact boundary epsilon does not repeatedly free and retrap hull', s.eventCounts.Stuck === 1 && !s.eventCounts.Freed, s.eventCounts);
  c = lowStake(); c.tideKeys = [[0, 1.4], [1500, 1.4]]; c.scenarios.harbor.z = 10; s = state(c); run(s, 360, { forward: true });
  check('High water permits safe passage over covered stakes', !s.eventCounts.StakeImpact && !s.stuck && s.z < -10, riverSnapshot(s));

  c = lowStake(); c.scenarios.harbor.z = 7;
  const straight = state(c), glancing = state(c); straight.vz = -5; glancing.x = 1.5; glancing.vz = -5;
  run(straight, 120, { forward: true }); run(glancing, 120, { forward: true });
  const straightDamage = Math.max(0, ...straight.events.filter(e => e.type === 'StakeImpact').map(e => e.damage));
  const glancingDamage = Math.max(0, ...glancing.events.filter(e => e.type === 'StakeImpact').map(e => e.damage));
  check('Glancing strike has less normal-energy damage than head-on', straightDamage > glancingDamage && glancing.eventCounts.StakeImpact > 0, { straightDamage, glancingDamage });
  c = lowStake(); c.scenarios.harbor.z = 8; s = state(c); s.vz = -300; stepRiver(s, {});
  check('High speed sweep cannot tunnel through thin stake in one tick', s.eventCounts.StakeImpact === 1 && s.z > 0 && s.stuck?.kind === 'stake', riverSnapshot(s));
  c = lowStake(); c.map.stakes[0].x = 2; s = state(c); run(s, 900, { left: true });
  check('Rotating hull sweeps into a stake without translating', s.eventCounts.StakeImpact > 0, riverSnapshot(s));
  c = clean(); c.map.obstacles = [{ id: 'test-pier', x: 0, z: 0, radiusM: 3 }]; c.scenarios.harbor.z = 10; s = state(c); run(s, 600, { forward: true });
  check('Solid pier contact blocks boat and does not become a stake trap', s.z > 5 && s.eventCounts.SolidImpact > 0 && !s.stuck, riverSnapshot(s));

  c = clean(); const intact = state(c), noRudder = state(c), noOars = state(c);
  noRudder.components.rudder = 0; noOars.components.oars = 0;
  run(intact, 300, { forward: true, left: true }); run(noRudder, 300, { forward: true, left: true }); run(noOars, 300, { forward: true });
  check('Broken rudder removes steering authority', intact.yaw > 1 && noRudder.yaw === 0, { intactYaw: intact.yaw, damagedYaw: noRudder.yaw });
  check('Broken oars remove propulsion in still water', Math.hypot(noOars.vx, noOars.vz) < 1e-10);
  c = clean(); c.scenarios.harbor = { x: 0, z: 26, yaw: 0, timeOffsetS: 0 }; s = state(c); s.components.rudder = 0;
  action(s, 'repair', 'same-repair');
  run(s, 600, { actions: [{ id: 'same-repair', type: 'repair' }] });
  check('Repair requires work then restores one component', s.components.rudder === c.repair.integrityPerJob && s.eventCounts.RepairCompleted === 1, riverSnapshot(s));
  check('Duplicate repair command does not repeat timber debit', s.timber === c.repair.initialTimber - c.repair.timberPerJob, s.timber);
  action(s, 'anchor'); run(s, 300, { left: true, forward: true });
  check('Repaired rudder restores some turning ability', s.yaw > 0, s.yaw);
  c = clean(); s = state(c); s.x = 100; s.components.rudder = 0; stepRiver(s); const timber = s.timber; action(s, 'repair'); run(s, 600);
  check('Repair outside a service zone is refused with no cost', s.timber === timber && !s.repairJob && s.components.rudder === 0);

  c = clean(); const leaking = state(c), pumping = state(c);
  leaking.components.hull = 60; pumping.components.hull = 60; leaking.floodKg = 100; pumping.floodKg = 100;
  action(pumping, 'pump'); run(leaking, 300); run(pumping, 299);
  check('Hull leak increases draft; pumping removes water', leaking.floodKg > 100 && pumping.floodKg < 100 && draftOf(c, leaking) > draftOf(c, pumping), { leak: leaking.floodKg, pumped: pumping.floodKg });
  s = state(c); const initialDraft = draftOf(c, s); action(s, 'unload', 'unload-once'); run(s, 300, { actions: [{ id: 'unload-once', type: 'unload' }] });
  check('Unloading reduces draft exactly once and never removes crew mass', s.cargoKg === 0 && s.discardedKg === c.vessels.light.cargoKg && draftOf(c, s) < initialDraft && draftOf(c, s) > c.vessels.light.baseDraftM);

  c = lowStake(); s = state(c); stepRiver(s); action(s, 'recover'); run(s, 1800);
  check('Shallow stake entrapment can be prepared and pulled clear', !s.stuck && s.eventCounts.Freed === 1 && s.z > 3, riverSnapshot(s));
  c = lowStake(); c.tideKeys = [[0, -0.5], [1500, -0.5]]; s = state(c); stepRiver(s); const startZ = s.z; action(s, 'recover'); run(s, 1800);
  check('Deep entrapment cannot be escaped by a free instant button', s.stuck?.kind === 'stake' && Math.abs(s.z - startZ) < 1e-9 && s.warnings.some(w => w.includes('quá sâu')), riverSnapshot(s));
  c = lowStake(); c.tideKeys = [[0, 0.2], [20, 1.6], [1500, 1.6]]; s = state(c); stepRiver(s); run(s, 900);
  check('Rising tide can naturally refloat a trapped boat', !s.stuck && s.eventCounts.Freed === 1, riverSnapshot(s));
  c = lowStake(); s = state(c); stepRiver(s);
  const firstDamage = s.components.hull;
  c.tideKeys = [[0, 1.4], [1500, 1.4]]; run(s, 2);
  c.tideKeys = [[0, 0.32], [1500, 0.32]]; stepRiver(s);
  check('A genuinely new contact after refloating can cause a new impact', s.eventCounts.StakeImpact === 2 && s.components.hull < firstDamage, s.eventCounts);
  c = lowStake(); c.scenarios.harbor.z = -7; s = state(c); s.vz = 5; run(s, 120);
  check('A stern strike damages the rudder component', s.components.rudder < 100 && s.eventCounts.StakeImpact > 0, s.components);

  function replay(fps, config, ticks, stall = false, commandDuration = ticks) {
    const result = state(config);
    const clock = createFixedClock(config.tickHz, config.maxCatchUpTicks);
    const command = () => stepRiver(result, { forward: result.tick < commandDuration * 0.8, left: result.tick < commandDuration * 0.2, right: result.tick >= commandDuration * 0.2 && result.tick < commandDuration * 0.4 });
    const frames = ticks / config.tickHz * fps;
    for (let i = 0; i < frames; i++) clock.advance(stall && i === 10 ? 1000 / fps + 500 : 1000 / fps, command);
    if (stall) { while (result.tick < ticks + 15) clock.advance(0, command); }
    else while (result.tick < ticks) clock.advance(0, command);
    return result;
  }
  c = clean(); const reference = replay(30, c, 900);
  for (const fps of [5, 10, 15, 30, 60, 144]) {
    const r = replay(fps, c, 900);
    check(`Fixed simulation matches at ${fps} render FPS`, r.tick === reference.tick && r.x === reference.x && r.z === reference.z && r.yaw === reference.yaw, { tick: r.tick, x: r.x, z: r.z });
  }
  const stalled = replay(60, c, 900, true); const continuous = replay(30, c, 915, false, 900);
  check('A 500ms frame stall retains and drains simulation debt', stalled.tick === 915 && stalled.x === continuous.x && stalled.z === continuous.z, { tick: stalled.tick, x: stalled.x, referenceX: continuous.x });
  c = lowStake(); c.scenarios.harbor.z = 10;
  for (const fps of [5, 15, 60, 144]) {
    const a = replay(fps, c, 300), b = replay(30, c, 300);
    check(`Stake outcomes remain identical at ${fps} render FPS`, JSON.stringify(a.eventCounts) === JSON.stringify(b.eventCounts) && a.components.hull === b.components.hull && a.x === b.x && a.z === b.z, { hull: a.components.hull, impacts: a.eventCounts.StakeImpact || 0 });
  }
  const actualEbb = createRiverState(base, { scenarioId: 'ebb' });
  run(actualEbb, 1000);
  check('Built-in falling-tide scenario actually pins the anchored vessel', actualEbb.stuck?.kind === 'stake' && actualEbb.eventCounts.StakeImpact > 0, riverSnapshot(actualEbb));
  action(actualEbb, 'recover');
  for (let i = 0; i < 2200 && !actualEbb.eventCounts.Freed; i++) stepRiver(actualEbb);
  action(actualEbb, 'anchor'); run(actualEbb, 300);
  check('Built-in falling-tide scenario can be pulled clear then anchored safely', !actualEbb.stuck && actualEbb.eventCounts.Freed > 0, riverSnapshot(actualEbb));
  observations.lightDraft = draftOf(base, createRiverState(base));
  observations.heavyDraft = draftOf(base, createRiverState(base, { vesselType: 'transport' }));
  return { configVersion: base.version, checks, passed: checks.filter(c => c.passed).length, total: checks.length, observations, benchmarkFPS: false };
}
