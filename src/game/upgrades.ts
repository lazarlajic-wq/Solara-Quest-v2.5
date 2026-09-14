export interface RunStats {
  damageMultiplier: number;
  cooldownReduction: number;
  moveSpeedBonus: number;
  dashCooldownMultiplier: number;
  potionMultiplier: number;
  shieldMultiplier: number;
  projectileSizeMultiplier: number;
}

export const createRunStats = (): RunStats => ({
  damageMultiplier: 1,
  cooldownReduction: 0,
  moveSpeedBonus: 0,
  dashCooldownMultiplier: 1,
  potionMultiplier: 1,
  shieldMultiplier: 1,
  projectileSizeMultiplier: 1,
});

export interface Upgrade {
  id: string;
  title: string;
  description: string;
  apply(stats: RunStats): void;
}

export const UPGRADE_POOL: readonly Upgrade[] = [
  { id: "solar-force", title: "Solar Force", description: "+15% Schaden", apply: (stats) => { stats.damageMultiplier += .15; } },
  { id: "wind-tread", title: "Wind Tread", description: "+12% Bewegungstempo", apply: (stats) => { stats.moveSpeedBonus += .12; } },
  { id: "quickening", title: "Quickening", description: "-8% Skill-Cooldowns", apply: (stats) => { stats.cooldownReduction = Math.min(.3, stats.cooldownReduction + .08); } },
  { id: "blink-core", title: "Blink Core", description: "-15% Dash-Cooldown", apply: (stats) => { stats.dashCooldownMultiplier = Math.max(.55, stats.dashCooldownMultiplier - .15); } },
  { id: "wide-cast", title: "Wide Cast", description: "+25% Projektilgrösse", apply: (stats) => { stats.projectileSizeMultiplier += .25; } },
  { id: "warding-flask", title: "Warding Flask", description: "+30% Schildstärke", apply: (stats) => { stats.shieldMultiplier += .3; } },
  { id: "life-bloom", title: "Life Bloom", description: "+30% Heiltrank-Heilung", apply: (stats) => { stats.potionMultiplier += .3; } },
] as const;

export function drawUpgradeChoices(count = 3) {
  const available = [...UPGRADE_POOL];
  const choices: Upgrade[] = [];
  while (choices.length < count && available.length > 0) {
    const index = Math.floor(Math.random() * available.length);
    choices.push(available.splice(index, 1)[0]);
  }
  return choices;
}
