export interface CombatSnapshot {
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  alive: boolean;
}

export class CombatState {
  private cooldowns = new Map<string, number>();
  private _health: number;
  private _shield = 0;

  constructor(private readonly maxHealth: number) {
    this._health = maxHealth;
  }

  update(delta: number) {
    for (const [id, remaining] of this.cooldowns) {
      const next = Math.max(0, remaining - delta);
      if (next === 0) this.cooldowns.delete(id);
      else this.cooldowns.set(id, next);
    }
  }

  canUse(id: string) {
    return !this.cooldowns.has(id) && this._health > 0;
  }

  startCooldown(id: string, seconds: number) {
    this.cooldowns.set(id, seconds);
  }

  cooldownRemaining(id: string) {
    return this.cooldowns.get(id) ?? 0;
  }

  heal(amount: number) {
    if (this._health <= 0) return 0;
    const before = this._health;
    this._health = Math.min(this.maxHealth, this._health + amount);
    return this._health - before;
  }

  grantShield(amount: number) {
    this._shield = Math.min(this.maxHealth, this._shield + amount);
  }

  takeDamage(amount: number) {
    if (this._health <= 0) return { absorbed: 0, healthDamage: 0 };

    const absorbed = Math.min(this._shield, amount);
    this._shield -= absorbed;
    const healthDamage = Math.min(this._health, amount - absorbed);
    this._health -= healthDamage;

    return { absorbed, healthDamage };
  }

  get snapshot(): CombatSnapshot {
    return {
      health: this._health,
      maxHealth: this.maxHealth,
      shield: this._shield,
      maxShield: this.maxHealth,
      alive: this._health > 0,
    };
  }
}

export const applyCooldownReduction = (baseSeconds: number, reductionPercent: number) => {
  const cappedReduction = Math.min(Math.max(reductionPercent, 0), 0.3);
  return baseSeconds * (1 - cappedReduction);
};
