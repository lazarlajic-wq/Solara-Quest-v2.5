# Solara Quest — MVP Game Specification

**Status:** Foundation specification  
**Goal:** Validate whether Solara Quest is fun before building the larger MMORPG.

## 1. Product definition

Solara Quest MVP is a fast, skill-based, top-down pixel-action game with a 3D technical presentation.

- **Visual identity:** readable pixel art, top-down camera, strong VFX
- **Renderer:** Three.js
- **Camera:** smooth orthographic top-down camera
- **Movement:** true 360-degree movement; no grid movement
- **Combat:** aim, movement, positioning, timing, cooldown management and team play must matter
- **Game modes:** Floor Rush and Solara Royale
- **Not in MVP:** persistent MMORPG world, story campaign, on-chain wallet, token cash-out, marketplace, paid power

## 2. MVP success question

The MVP exists to answer:

> Do players enjoy the combat enough to play again with friends or strangers?

Primary signals:
- completed matches/runs
- repeat sessions
- average Floor Rush level reached
- class selection and win rate
- Royale participation
- player feedback on combat and movement

## 3. Game modes

### Floor Rush

A cooperative or solo survival climb.

- 1–4 players
- 40 floors
- escalating monster difficulty
- boss encounter every 5th floor
- temporary loot, levels and upgrades during the run
- a failed run resets run-specific level and gear
- goal: reach the furthest floor and improve the personal/team record

### Solara Royale

A match-based PvPvE battle royale.

- Solo, Duo and Squad queues
- target presentation: 40 characters per map
- early MVP may use bots to fill the map while real-player networking is validated
- every player starts from equal base equipment
- players farm mobs, gain XP, find gear and fight other teams
- last surviving player/team wins
- no persistent power advantage

## 4. Shared player controls

| Input | Action |
|---|---|
| WASD / left stick | 360-degree movement |
| Mouse / right stick | Aim |
| Left click | Basic attack |
| Shift | Dash / evade |
| Q, E, R, F | Class skills 1–4 |
| 1 | Healing potion |
| 2 | Shield item |
| 3 | Chaos item (e.g. Boss Spawner) |

## 5. Universal combat rules

### Dash

All classes use Shift for dash.

- moves in current movement direction
- brief invulnerability window
- baseline cooldown: 3 seconds
- cannot pass through solid map collision
- class tuning may change distance or side effect, but every class must retain the same core rule

### Consumables

- **Healing potion:** limited healing resource; cannot be used while fully protected by a shield
- **Shield item:** temporary damage shield; clear visual feedback
- **Chaos item:** a rare tactical item. The initial version is the Boss Spawner.

### Boss Spawner

The player throws a marked bomb. After a short visible warning, a neutral boss spawns at the impact point.

- rare map pickup
- 2-second warning and target marker
- neutral boss attacks nearby targets
- no automatic kill credit to the summoner
- despawns after 60 seconds if not defeated
- boss rewards XP/loot to the player or team that defeats it

## 6. Classes

Each class has a basic attack plus four active skills. Skills are original Solara abilities inspired only by high-level role fantasies.

### Solaris Warden — Tank

Role: initiation, protection, disruption.

1. **Aegis Charge** — shield sprint that pushes enemies.
2. **Iron Slam** — ground strike with slow and short knock-up.
3. **Guardian Link** — protects an ally or grants a solo shield.
4. **Gravity Verdict** — pulls nearby enemies inward, then stuns them.

### Void Blade — Assassin

Role: mobility, precision, isolated eliminations.

1. **Twin Shuriken** — outgoing and returning blade skillshot.
2. **Shadow Step** — dash to a shadow mark; recast to return.
3. **Phantom Barrage** — rapid close-range multi-hit attack.
4. **Eclipse Hunt** — marked-target execution sequence with cooldown refund on kill.

### Sunwind Ranger — Archer

Role: range, kiting, area denial.

1. **Piercing Arrow** — chargeable penetrating shot.
2. **Arrow Rain** — targeted arrow barrage zone.
3. **Windstep** — backward leap and temporary movement/attack-speed boost.
4. **Moonveil** — brief stealth, cleanse and returning homing-arrow burst.

### Astral Arcanist — Mage

Role: crowd control, spell combinations, area damage.

1. **Ember Orb** — explosive burning projectile.
2. **Gale Surge** — knockback wind wave.
3. **Frostwell** — slow field that briefly freezes enemies.
4. **Celestial Waltz** — interruptible multi-hit magical wave and final explosion.

## 7. Run equipment and builds

Equipment is temporary within each Floor Rush run and each Royale match.

| Slot | Build purpose |
|---|---|
| Weapon | damage, attack speed, skill power, critical chance |
| Armor | health, armor, magic resistance, shield strength |
| Boots | movement speed, dash cooldown, slow resistance |
| Relic | special passive or skill modification |

Principles:
- stats must remain easy to understand
- maximum cooldown reduction: **30%**
- gear creates different builds but must not remove the need for aim, timing or positioning
- no pay-to-win and no permanent stat advantage in Royale

## 8. Technical foundation

- TypeScript game code
- Three.js for rendering, camera, particles, light, depth and visual effects
- pixel art assets remain the primary visual language
- orthographic top-down camera with smoothing, camera shake and controlled zoom
- simulation must separate gameplay state from rendering
- skills use explicit hitboxes/projectiles and timing events; animations never determine damage by themselves
- multiplayer architecture will be added incrementally; client authority is acceptable only for short internal prototype testing

## 9. MVP exclusions

Do not add these until core playtesting proves the combat loop:

- persistent open-world story
- transformations and pet evolution
- marketplace/trading
- cryptocurrency rewards, wallet connection or Solana conversion
- ranked ladder
- 10-region MMORPG content
- full 40-real-player authoritative Battle Royale infrastructure

## 10. Build order

1. Repo foundation and Three.js scene
2. Player movement, aiming, camera and dash
3. One reference class and basic combat target
4. Shared health, damage, cooldown, potion and shield systems
5. Remaining three classes
6. Floor Rush: floors, mobs, bosses, loot, upgrades
7. Solara Royale prototype: map, bots, PvP and match loop
8. Playtest instrumentation and feedback screen
9. Public MVP test
