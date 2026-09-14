/**
 * Data-only configuration for the local Solara Royale MVP.
 *
 * Keep this file rendering and networking agnostic. The current prototype can import it
 * locally; a later authoritative server can use the same values and type contracts.
 */

export type RoyalePlaylist = 'solo' | 'duo' | 'squad';

export type RoyaleLootRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type RoyaleLootSlot = 'weapon' | 'armor' | 'boots' | 'relic';

export type RoyaleUpgradeKind =
  | 'damage'
  | 'movementSpeed'
  | 'cooldownReduction'
  | 'dashCooldown'
  | 'projectileSize'
  | 'shieldStrength'
  | 'potionPower';

export interface RoyalePlaylistConfig {
  id: RoyalePlaylist;
  displayName: string;
  teamSize: number;
  maxCombatants: number;
  maxTeams: number;
  allowDownedState: boolean;
}

export interface RoyaleZonePhase {
  id: number;
  waitSeconds: number;
  shrinkSeconds: number;
  radius: number;
  outsideDamagePerSecond: number;
}

export interface RoyaleMobTier {
  id: 'common' | 'elite' | 'neutralBoss';
  spawnCount: [number, number];
  healthMultiplier: number;
  damageMultiplier: number;
  xpReward: number;
  lootRarityFloor: RoyaleLootRarity;
}

export interface RoyaleLootDefinition {
  id: string;
  displayName: string;
  rarity: RoyaleLootRarity;
  slot: RoyaleLootSlot;
  stat: RoyaleUpgradeKind;
  amount: number;
}

export const ROYALE_CONFIG = {
  match: {
    targetCombatants: 40,
    stagingSeconds: 10,
    firstSpawnInvulnerabilitySeconds: 4,
    maxMatchSeconds: 12 * 60,
    maxCooldownReduction: 0.3,
    bossSpawnerWarningSeconds: 2,
    bossSpawnerLifetimeSeconds: 60,
    levelUpChoiceSeconds: 12,
    initialMapSeed: 'solara-royale-mvp',
  },

  playlists: {
    solo: {
      id: 'solo',
      displayName: 'Solo',
      teamSize: 1,
      maxCombatants: 40,
      maxTeams: 40,
      allowDownedState: false,
    },
    duo: {
      id: 'duo',
      displayName: 'Duo',
      teamSize: 2,
      maxCombatants: 40,
      maxTeams: 20,
      allowDownedState: true,
    },
    squad: {
      id: 'squad',
      displayName: 'Squad',
      teamSize: 4,
      maxCombatants: 40,
      maxTeams: 10,
      allowDownedState: true,
    },
  } satisfies Record<RoyalePlaylist, RoyalePlaylistConfig>,

  zonePhases: [
    { id: 1, waitSeconds: 120, shrinkSeconds: 75, radius: 105, outsideDamagePerSecond: 2 },
    { id: 2, waitSeconds: 75, shrinkSeconds: 60, radius: 68, outsideDamagePerSecond: 5 },
    { id: 3, waitSeconds: 50, shrinkSeconds: 50, radius: 38, outsideDamagePerSecond: 10 },
    { id: 4, waitSeconds: 25, shrinkSeconds: 35, radius: 16, outsideDamagePerSecond: 18 },
  ] satisfies readonly RoyaleZonePhase[],

  mobTiers: [
    {
      id: 'common',
      spawnCount: [3, 6],
      healthMultiplier: 1,
      damageMultiplier: 1,
      xpReward: 18,
      lootRarityFloor: 'common',
    },
    {
      id: 'elite',
      spawnCount: [1, 2],
      healthMultiplier: 3.2,
      damageMultiplier: 1.65,
      xpReward: 90,
      lootRarityFloor: 'rare',
    },
    {
      id: 'neutralBoss',
      spawnCount: [0, 1],
      healthMultiplier: 10,
      damageMultiplier: 2.1,
      xpReward: 300,
      lootRarityFloor: 'epic',
    },
  ] satisfies readonly RoyaleMobTier[],

  loot: [
    { id: 'sunsteel-blade', displayName: 'Sunsteel Blade', rarity: 'common', slot: 'weapon', stat: 'damage', amount: 0.08 },
    { id: 'warden-plate', displayName: 'Warden Plate', rarity: 'common', slot: 'armor', stat: 'shieldStrength', amount: 0.1 },
    { id: 'windstep-boots', displayName: 'Windstep Boots', rarity: 'rare', slot: 'boots', stat: 'dashCooldown', amount: -0.35 },
    { id: 'astral-focus', displayName: 'Astral Focus', rarity: 'rare', slot: 'relic', stat: 'projectileSize', amount: 0.14 },
    { id: 'eclipse-core', displayName: 'Eclipse Core', rarity: 'epic', slot: 'relic', stat: 'cooldownReduction', amount: 0.1 },
    { id: 'solara-heart', displayName: 'Solara Heart', rarity: 'legendary', slot: 'relic', stat: 'potionPower', amount: 0.35 },
  ] satisfies readonly RoyaleLootDefinition[],

  upgradeWeights: {
    damage: 1,
    movementSpeed: 0.85,
    cooldownReduction: 0.75,
    dashCooldown: 0.7,
    projectileSize: 0.65,
    shieldStrength: 0.75,
    potionPower: 0.6,
  } satisfies Record<RoyaleUpgradeKind, number>,
} as const;

export function getRoyaleBotCount(playlist: RoyalePlaylist, humanCombatants: number): number {
  const maxCombatants = ROYALE_CONFIG.playlists[playlist].maxCombatants;
  return Math.max(0, maxCombatants - Math.min(Math.max(0, humanCombatants), maxCombatants));
}

export function clampCooldownReduction(value: number): number {
  return Math.min(Math.max(0, value), ROYALE_CONFIG.match.maxCooldownReduction);
}
