import type { RunStats } from "./upgrades";

export type EquipmentSlot = "weapon" | "armor" | "boots" | "relic";
export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface Equipment {
  id: string;
  slot: EquipmentSlot;
  rarity: Rarity;
  name: string;
  score: number;
  description: string;
  apply(stats: RunStats): void;
}

const RARITY: Record<Rarity, { score: number; label: string; multiplier: number }> = {
  common: { score: 1, label: "Common", multiplier: 1 },
  rare: { score: 2, label: "Rare", multiplier: 1.5 },
  epic: { score: 3, label: "Epic", multiplier: 2.1 },
  legendary: { score: 4, label: "Legendary", multiplier: 3 },
};

const rollRarity = (floor: number): Rarity => {
  const roll = Math.random() + Math.min(floor, 40) * .008;
  if (roll > .985) return "legendary";
  if (roll > .91) return "epic";
  if (roll > .66) return "rare";
  return "common";
};

const randomSlot = (): EquipmentSlot => (["weapon", "armor", "boots", "relic"] as const)[Math.floor(Math.random() * 4)];

export function rollEquipment(floor: number, guaranteedBossDrop = false): Equipment {
  const slot = randomSlot();
  const rarity = guaranteedBossDrop ? (floor >= 20 && Math.random() > .55 ? "epic" : "rare") : rollRarity(floor);
  const meta = RARITY[rarity];
  const value = meta.multiplier;

  if (slot === "weapon") {
    return { id: crypto.randomUUID(), slot, rarity, score: meta.score, name: meta.label + " Sunblade", description: "+" + Math.round(10 * value) + "% Schaden", apply: (stats) => { stats.damageMultiplier += .1 * value; } };
  }
  if (slot === "armor") {
    return { id: crypto.randomUUID(), slot, rarity, score: meta.score, name: meta.label + " Aegis Plate", description: "+" + Math.round(18 * value) + "% Schildstärke", apply: (stats) => { stats.shieldMultiplier += .18 * value; } };
  }
  if (slot === "boots") {
    return { id: crypto.randomUUID(), slot, rarity, score: meta.score, name: meta.label + " Wind Boots", description: "+" + Math.round(6 * value) + "% Tempo", apply: (stats) => { stats.moveSpeedBonus += .06 * value; stats.dashCooldownMultiplier = Math.max(.5, stats.dashCooldownMultiplier - .04 * value); } };
  }
  return { id: crypto.randomUUID(), slot, rarity, score: meta.score, name: meta.label + " Astral Relic", description: "-" + Math.round(5 * value) + "% Skill-CD", apply: (stats) => { stats.cooldownReduction = Math.min(.3, stats.cooldownReduction + .05 * value); } };
}
