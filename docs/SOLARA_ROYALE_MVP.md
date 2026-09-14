# Solara Royale — MVP Specification

## 1. Purpose

Solara Royale is a **fun-first PvPvE prototype** for validating combat, class identity,
movement and repeatability. It is not yet a production battle royale, persistent MMO or
token economy. The target is one complete match that a test player immediately understands:

```text
Choose mode → spawn → fight mobs and players → level and loot → survive → win
```

The same four classes, controls and combat foundation are shared with Floor Rush.

## 2. MVP boundaries

Included:

- Solo, Duo and Squad playlists
- Up to 40 combatants per match
- Bots fill unused participant slots
- One rotating, procedurally dressed 3D world
- PvPvE: neutral mobs, player combat, XP and run-only loot
- Match start, shrinking play zone, eliminations and winner screen
- Local/simulated match host with deterministic bot behaviour where practical

Explicitly excluded:

- Real matchmaking, accounts, parties, chat, reconnects or server authority
- Real 40-player networking and anti-cheat
- Wallets, Solana, token rewards, withdrawal, purchases or persistent power
- Ranked ladder, cosmetics store, story/MMORPG progression and cross-match inventory

## 3. Player modes and capacity

| Playlist | Human party size | Teams at 40 figures | Win condition |
| --- | ---: | ---: | --- |
| Solo | 1 | 40 | last player alive |
| Duo | 2 | 20 | last team alive |
| Squad | 4 | 10 | last team alive |

The test UI may begin with one local player. Every remaining combatant is a bot. A future
networked layer can replace bots one by one without changing gameplay rules.

## 4. Shared controls and combat contract

```text
WASD        camera-relative movement
Shift       dash / evade
Left mouse  basic attack toward cursor
Right mouse hold + drag  rotate the 45° top-down camera
1–4         the four selected class skills
5           healing potion
6           shield consumable
7           chaos item (e.g. Boss Spawner)
```

- Camera: perspective camera, default 45° top-down angle; user can orbit horizontally while
  holding right mouse button. World height is the Y-axis. Rotation must never make WASD feel
  screen-rotated: movement stays camera-relative.
- The combat model is skill-first: aiming, dodging, positioning, cooldown timing and team
  focus are more decisive than loot.
- Crowd-control requires short, readable durations and a post-CC protection window so players
  cannot be permanently locked.
- All hit areas, projectiles and damage events must be authored as gameplay data, never inferred
  from visual animation frames.

## 5. Classes

The initial classes are Tank, Assassin, Archer and Mage. Each has a normal attack plus four
active skills. Their exact skill kits come from `SOLARA_GAME_SPEC.md` and must behave the same
in Floor Rush and Royale, except for separately tuned PvP values.

| Class | Primary match role |
| --- | --- |
| Tank | engage, peel, zone control |
| Assassin | flank, isolated-target execution, escape |
| Archer | ranged pressure, kiting, objective control |
| Mage | area denial, combo control, burst windows |

All players start with baseline class stats. No class gets an inherent permanent advantage from
past matches.

## 6. Match loop

### Phase A — staging (10 seconds)

1. Player selects Solo, Duo or Squad.
2. The match generates a seed, terrain dressing, mob camps, loot locations and zone centres.
3. Human slots are reserved; bots fill to 40 figures.
4. Teams spawn at separated edge locations with a short invulnerability period.

### Phase B — early game (0–4 minutes)

- Players choose a route, kill neutral mobs for XP and locate basic equipment.
- First zone is large; it encourages exploration, not immediate forced PvP.
- Mobs are intentionally worthwhile but dangerous enough to expose a farming player to attack.

### Phase C — mid game (4–8 minutes)

- The safe zone contracts in clear stages.
- Elite camps and better loot create visible contest points.
- Surviving players reach meaningful builds through level-up choices and gear, not random luck
  alone.

### Phase D — final circle (8–12 minutes)

- The final zone forces encounters.
- No respawns in the MVP.
- Last living player/team wins; show match recap and `Play Again`.

## 7. World and procedural variation

The MVP uses one gameplay-sized island/arena with a new presentation each match. It must not
need a new handcrafted map for every test.

Randomised per match:

- spawn locations and team separation
- water, grass, paths, rocks, trees, ruins and building dressing
- neutral mob camps, elite camps and boss-spawner loot locations
- loot container locations and rarity distribution within constrained rules
- first safe-zone centre plus later zone drift
- daylight/fog colour palette only when it does not reduce combat readability

Non-random constraints:

- every spawn has at least two viable exits and no immediate line of sight to another spawn
- no unreachable loot or enclosed terrain traps
- boss/elite arenas have multiple approach angles and escape routes
- critical combat spaces remain uncluttered and visible at the 45° camera angle

## 8. PvPvE systems

### Neutral mobs

| Type | Purpose | Reward | Risk |
| --- | --- | --- | --- |
| Common pack | fast early XP | small XP, common drop chance | reveals position through VFX/combat |
| Elite camp | contested progression | large XP, higher rarity loot | durable, dangerous, attracts players |
| Neutral boss | chaos and late-game objective | premium loot / high XP | attacks any nearby team; may disrupt PvP |

- Mobs scale by match phase and local player level so farming cannot become completely safe.
- Mob damage should threaten a distracted player but should not instantly delete a full-health
  player.
- Mobs do not give permanent account progression.

### XP and level-up choices

- XP comes from mobs, participation in eliminations and objectives; last-hitting alone should
  not deny nearby contributors.
- A level-up briefly pauses only the local bot/player's decision layer, not the entire Royale
  match. For the local MVP, present three choices with a short countdown and auto-pick on expiry.
- Upgrades are run-only and use the existing controlled categories: damage, speed, cooldown,
  dash recovery, projectile size, shield strength and potion power.
- Total cooldown reduction remains capped at 30%.

### Loot

Loot is simple, readable and run-only.

| Rarity | Purpose | Example effect |
| --- | --- | --- |
| Common | baseline improvement | +damage or +health |
| Rare | build direction | projectile size, shield strength, dash recovery |
| Epic | noticeable power spike | a skill modifier or strong stat bundle |
| Legendary | rare match-defining choice | controlled unique passive; never an instant win |

Initial slots: weapon, armour, boots and relic. Auto-equip upgrades only if clearly stronger for
the MVP; a later inventory screen can add manual comparison. Gear must respect the 30% cooldown
reduction cap.

## 9. Boss Spawner chaos item

- Spawn as a rare, obvious world pickup or elite/boss reward.
- Key `7` throws a visible projectile to the targeted location.
- The impact marker gives opponents 2 seconds of warning.
- A neutral boss appears and targets the nearest valid combatant/team, not automatically the
  thrower’s chosen victim.
- The boss stays for 60 seconds or until defeated, then despawns.
- It grants no automatic kill credit to the thrower; normal contribution rules award its reward.
- It must be dangerous and disruptive, but never block the final circle or create unavoidable
  damage.

## 10. Zone and elimination rules

- Zone contraction uses 3–4 clear phases for the MVP.
- Outside-zone damage starts forgiving, then ramps in later phases.
- Damage, current safe area and time-to-shrink are always visible in the HUD.
- A downed-state is optional for the first local prototype. If implemented, it applies only to
  Duo/Squad, allows a short revive, and is disabled for Solo.
- Eliminated figures become non-interactive and leave a readable loot drop.

## 11. Bots (MVP only)

Bots are simulation placeholders, not hidden fake multiplayer.

Each bot has:

- one of the four classes and a mode-valid team id
- simple priorities: survive zone → respond to threat → farm nearby camp → seek loot → engage
  weaker/outnumbered targets
- aim inaccuracy and reaction-time bands so they are believable and beatable
- basic skill combos, potion/shield use, dash usage and retreat behaviour

Bots must not read hidden player state, aim perfectly, ignore collision or receive extra stats.
Difficulty is configured by match phase and player-test setting.

## 12. Technical architecture for the prototype

```text
Three.js renderer
  ├─ perspective 45° top-down camera + user orbit
  ├─ pixelated render target / post-processing
  ├─ terrain, props, lights, VFX and HUD anchors
  └─ interpolation only (never authoritative rules)

TypeScript game core
  ├─ fixed-timestep simulation
  ├─ input → movement → collision → combat events
  ├─ entities: player, bot, mob, projectile, pickup, zone
  ├─ seeded map and spawn generator
  ├─ class/skill/item data definitions
  └─ local match state machine

Future multiplayer boundary
  └─ replace local match host with server authority;
     preserve the same event/data contracts
```

Performance targets for the test build:

- 60 FPS on a modern desktop browser at normal resolution
- 40 total player/bot figures plus mobs and VFX without material frame drops
- object pooling for projectiles, damage text, particles and recurring mobs
- instancing for repeated props where it improves draw calls

## 13. Acceptance criteria

A Royale MVP test is ready when one local player can:

1. choose Solo, Duo or Squad;
2. start a match that fills to 40 figures with bots;
3. move, aim, dash, rotate the camera and use skills responsively;
4. fight mobs and other combatants;
5. gain XP, select run-only upgrades and collect/equip loot;
6. observe a shrinking zone, eliminations and a winner;
7. use a Boss Spawner without breaking the match;
8. finish a match and restart immediately.

The primary evaluation is qualitative: do players say it feels responsive, understandable,
chaotic in a good way and worth another match? Track only lightweight local telemetry for the
MVP: match length, class choice, kills, deaths, XP/loot choices, zone deaths and `Play Again`.
