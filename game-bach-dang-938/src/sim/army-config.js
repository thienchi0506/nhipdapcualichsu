// Scenario values for the local command sandbox. All distances are metres.
export const armyDefaults = Object.freeze({
  version: 'bd938-army-1', tickHz: 30, squadSize: 10, playerCount: 40, enemyCount: 40,
  health: 100, ammo: 12, speed: 1.8, radius: 0.35, formationSpacing: 1.1,
  sight: 23, sightIntervalTicks: 15, intelMaxAgeTicks: 900, fireRange: 17,
  fireIntervalTicks: 60, damage: 20, depotDamage: 4, bleedTicks: 2700, rescueTicks: 90,
  gridSize: 2, spatialCellM: 4, pathBudget: 3, maxNodes: 2600, maxWade: 0.9,
  rallyX: -30, rallyZ: 56, initialLossThreshold: 0.4,
  depotRadius: 5, supplyRateTicks: 30, repairTicks: 150,
  recruitmentTicks: 150, recruitHealth: 100, recruitAmmo: 6,
  depotStock: { ammo: 500, timber: 40, medicine: 25, recruits: 30 },
  forwardStock: { ammo: 0, timber: 0, medicine: 0, recruits: 0 },
  convoyCapacity: 40, convoySpeed: 2.1, convoyBlockRadius: 5,
});
