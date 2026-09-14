export type PlayerClassId = "warden" | "assassin" | "ranger" | "arcanist";

export type AbilityKind =
  | "dash"
  | "area"
  | "projectile"
  | "shield"
  | "control"
  | "stealth"
  | "channel"
  | "execute";

export interface AbilityDefinition {
  key: "1" | "2" | "3" | "4";
  id: string;
  name: string;
  kind: AbilityKind;
  cooldown: number;
  damage: number;
  range: number;
  description: string;
}

export interface ClassKit {
  id: PlayerClassId;
  name: string;
  role: string;
  color: string;
  maxHealth: number;
  moveSpeed: number;
  basicAttackDamage: number;
  dashDistanceMultiplier: number;
  abilities: readonly AbilityDefinition[];
}

export const CLASS_KITS: Record<PlayerClassId, ClassKit> = {
  warden: {
    id: "warden",
    name: "Solaris Warden",
    role: "Tank · Initiation / protection",
    color: "#ff9f43",
    maxHealth: 180,
    moveSpeed: 5.7,
    basicAttackDamage: 14,
    dashDistanceMultiplier: 0.9,
    abilities: [
      { key: "1", id: "aegis-charge", name: "Aegis Charge", kind: "dash", cooldown: 7, damage: 22, range: 4.1, description: "Shield charge that pushes enemies." },
      { key: "2", id: "iron-slam", name: "Iron Slam", kind: "area", cooldown: 6, damage: 28, range: 2.25, description: "Ground slam with slow and knock-up." },
      { key: "3", id: "guardian-link", name: "Guardian Link", kind: "shield", cooldown: 14, damage: 0, range: 6, description: "Protect an ally or shield yourself." },
      { key: "4", id: "gravity-verdict", name: "Gravity Verdict", kind: "control", cooldown: 24, damage: 42, range: 3.2, description: "Pull enemies in, then stun them." },
    ],
  },
  assassin: {
    id: "assassin",
    name: "Void Blade",
    role: "Assassin · Mobility / execution",
    color: "#b697ff",
    maxHealth: 110,
    moveSpeed: 6.55,
    basicAttackDamage: 18,
    dashDistanceMultiplier: 1.18,
    abilities: [
      { key: "1", id: "twin-shuriken", name: "Twin Shuriken", kind: "projectile", cooldown: 4, damage: 24, range: 8, description: "Outgoing and returning blade skillshot." },
      { key: "2", id: "shadow-step", name: "Shadow Step", kind: "dash", cooldown: 8, damage: 16, range: 5.4, description: "Dash to a shadow mark, then recast to return." },
      { key: "3", id: "phantom-barrage", name: "Phantom Barrage", kind: "area", cooldown: 7, damage: 36, range: 1.85, description: "Rapid close-range multi-hit barrage." },
      { key: "4", id: "eclipse-hunt", name: "Eclipse Hunt", kind: "execute", cooldown: 22, damage: 54, range: 5.5, description: "Marked-target execution sequence." },
    ],
  },
  ranger: {
    id: "ranger",
    name: "Sunwind Ranger",
    role: "Archer · Range / kiting",
    color: "#75e9b0",
    maxHealth: 120,
    moveSpeed: 6.25,
    basicAttackDamage: 16,
    dashDistanceMultiplier: 1.05,
    abilities: [
      { key: "1", id: "piercing-arrow", name: "Piercing Arrow", kind: "projectile", cooldown: 4.5, damage: 30, range: 10, description: "Charged projectile that pierces targets." },
      { key: "2", id: "arrow-rain", name: "Arrow Rain", kind: "area", cooldown: 9, damage: 34, range: 4.25, description: "Targeted arrow barrage zone." },
      { key: "3", id: "windstep", name: "Windstep", kind: "dash", cooldown: 10, damage: 0, range: 3.8, description: "Backward leap and speed boost." },
      { key: "4", id: "moonveil", name: "Moonveil", kind: "stealth", cooldown: 21, damage: 38, range: 6, description: "Stealth, cleanse and homing-arrow burst." },
    ],
  },
  arcanist: {
    id: "arcanist",
    name: "Astral Arcanist",
    role: "Mage · Control / combos",
    color: "#6dc8ff",
    maxHealth: 105,
    moveSpeed: 5.95,
    basicAttackDamage: 12,
    dashDistanceMultiplier: 1,
    abilities: [
      { key: "1", id: "ember-orb", name: "Ember Orb", kind: "projectile", cooldown: 4, damage: 27, range: 8, description: "Explosive burning projectile." },
      { key: "2", id: "gale-surge", name: "Gale Surge", kind: "control", cooldown: 8, damage: 20, range: 6, description: "Wind wave that knocks enemies away." },
      { key: "3", id: "frostwell", name: "Frostwell", kind: "area", cooldown: 11, damage: 25, range: 4, description: "Slow field that briefly freezes." },
      { key: "4", id: "celestial-waltz", name: "Celestial Waltz", kind: "channel", cooldown: 24, damage: 52, range: 4.5, description: "Interruptible magical wave and final blast." },
    ],
  },
};

export const getClassKit = (id: PlayerClassId) => CLASS_KITS[id];
