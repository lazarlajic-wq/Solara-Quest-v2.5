import * as THREE from "three";
import { CLASS_KITS, type AbilityDefinition, type ClassKit, type PlayerClassId } from "./game/classKits";
import { CombatState } from "./game/combatState";
import { createRunStats, drawUpgradeChoices, type Upgrade } from "./game/upgrades";
import { rollEquipment, type Equipment, type EquipmentSlot } from "./game/loot";
import { createPixelWorld } from "./world/createPixelWorld";
import { createLobbyWorld, LOBBY_POINTS } from "./world/createLobbyWorld";
import { VfxSystem } from "./game/vfx";
import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");
const classPicker = document.querySelector<HTMLDivElement>("#class-picker");
const abilitiesHud = document.querySelector<HTMLElement>("#abilities");
const upgradeOverlay = document.querySelector<HTMLElement>("#upgrade-overlay");
const floorStatus = document.querySelector<HTMLSpanElement>("#floor-status");
const dashStatus = document.querySelector<HTMLSpanElement>("#dash-status");
const positionStatus = document.querySelector<HTMLSpanElement>("#position-status");
const classStatus = document.querySelector<HTMLSpanElement>("#class-status");
const healthStatus = document.querySelector<HTMLSpanElement>("#health-status");
const healthFill = document.querySelector<HTMLElement>("#health-fill");
const shieldFill = document.querySelector<HTMLElement>("#shield-fill");
const lootStatus = document.querySelector<HTMLSpanElement>("#loot-status");
const interactionStatus = document.querySelector<HTMLSpanElement>("#interaction-status");
const objectiveStatus = document.querySelector<HTMLSpanElement>("#objective-status");
const inviteButton = document.querySelector<HTMLButtonElement>("#invite-button");
const pauseOverlay = document.querySelector<HTMLElement>("#pause-overlay");
const resumeButton = document.querySelector<HTMLButtonElement>("#resume-button");
const villageButton = document.querySelector<HTMLButtonElement>("#village-button");
const cameraSensitivityInput = document.querySelector<HTMLInputElement>("#camera-sensitivity");
const pixelScaleInput = document.querySelector<HTMLInputElement>("#pixel-scale");
const royaleOverlay = document.querySelector<HTMLElement>("#royale-overlay");
const royalStartButton = document.querySelector<HTMLButtonElement>("#royale-start-button");
const royalCloseButton = document.querySelector<HTMLButtonElement>("#royale-close-button");
const royalModeButtons = document.querySelectorAll<HTMLButtonElement>("[data-royal-mode]");
const impactFlash = document.querySelector<HTMLElement>("#impact-flash");

if (!app || !classPicker || !abilitiesHud || !upgradeOverlay || !floorStatus || !dashStatus || !positionStatus || !classStatus || !healthStatus || !healthFill || !shieldFill || !lootStatus || !interactionStatus || !objectiveStatus || !inviteButton || !pauseOverlay || !resumeButton || !villageButton || !cameraSensitivityInput || !pixelScaleInput || !royaleOverlay || !royalStartButton || !royalCloseButton || !impactFlash) {
  throw new Error("Solara HUD could not be created.");
}

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
let pixelScale = .82;
renderer.setPixelRatio(1);
renderer.setSize(Math.floor(window.innerWidth * pixelScale), Math.floor(window.innerHeight * pixelScale), false);
renderer.domElement.style.width = "100vw";
renderer.domElement.style.height = "100vh";
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color("#89b5c9");
let floorMap = createLobbyWorld(scene);
const vfx = new VfxSystem(scene);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, .1, 100);
camera.up.set(0, 0, 1);
camera.position.set(0, 0, 10);

function resizeCamera() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(Math.floor(window.innerWidth * pixelScale), Math.floor(window.innerHeight * pixelScale), false);
}
resizeCamera();

const CAMERA_DISTANCE = 17;
let cameraYaw = 0;
let cameraPitch = THREE.MathUtils.degToRad(50);
let isCameraRotating = false;
type GameState = "lobby" | "floorRush" | "royale";
let gameState: GameState = "lobby";
let classMenuOpen = false;
let pauseOpen = false;
let cameraSensitivity = 1;
let lobbyMessage = "Explore the village · E to interact";
type RoyalMode = "solo" | "duo" | "squad";
let royalMode: RoyalMode = "solo";
let royaleEliminations = 0;
let royaleComplete = false;

const player = new THREE.Group();
const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.72, 8), new THREE.MeshBasicMaterial({ color: "#081019", transparent: true, opacity: 0.55 }));
shadow.scale.set(1.15, 0.62, 1);
const body = new THREE.Mesh(
  new THREE.BoxGeometry(.88, .88, 1.06),
  new THREE.MeshStandardMaterial({ color: "#ff9f43", roughness: .62, metalness: .08 }),
);
body.position.z = .62;
const facing = new THREE.Mesh(
  new THREE.BoxGeometry(.16, .82, .18),
  new THREE.MeshStandardMaterial({ color: "#fff0d6", roughness: .55, emissive: "#473221", emissiveIntensity: .18 }),
);
facing.position.set(.62, 0, .68);
const classAccent = new THREE.Group();
classAccent.name = "class-accent";
player.add(shadow, body, facing, classAccent);
scene.add(player);

const cursor = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.29, 16), new THREE.MeshBasicMaterial({ color: "#ffd26f", transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
cursor.position.z = 0.1;
scene.add(cursor);

type Enemy = {
  mesh: THREE.Group;
  health: number;
  maxHealth: number;
  speed: number;
  radius: number;
  attackTimer: number;
  tier: "mob" | "miniBoss" | "boss";
};

type Projectile = {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  velocity: THREE.Vector2;
  damage: number;
  life: number;
  radius: number;
  style: string;
  trailTimer: number;
};

type Effect = { mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>; life: number; maxLife: number };
type LootDrop = { mesh: THREE.Mesh<THREE.OctahedronGeometry, THREE.MeshStandardMaterial>; item: Equipment };

const enemies: Enemy[] = [];
const projectiles: Projectile[] = [];
const effects: Effect[] = [];
const lootDrops: LootDrop[] = [];
const equipment: Partial<Record<EquipmentSlot, Equipment>> = {};
const appliedUpgrades: Upgrade[] = [];

let floor = 1;
let runLevel = 1;
let runXp = 0;
let xpToNextLevel = 80;
let floorClearCountdown = -1;
let floorRewardPending = false;
let upgradeSecondsRemaining = 0;
let pendingChoices: Upgrade[] = [];
let runComplete = false;
let runStats = createRunStats();
let upgradeOpen = false;
let latestLoot = "—";

function rebuildRunStats() {
  runStats = createRunStats();
  for (const upgrade of appliedUpgrades) upgrade.apply(runStats);
  for (const item of Object.values(equipment)) item?.apply(runStats);
}

function spawnLoot(enemy: Enemy) {
  const guaranteed = enemy.tier !== "mob";
  if (!guaranteed && Math.random() > .28) return;
  const item = rollEquipment(floor, guaranteed);
  const colors: Record<Equipment["rarity"], string> = { common: "#dadce2", rare: "#62adff", epic: "#cc78ff", legendary: "#ffb450" };
  const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(.3, 0), new THREE.MeshStandardMaterial({ color: colors[item.rarity], emissive: colors[item.rarity], emissiveIntensity: .5, roughness: .4 }));
  mesh.position.set(enemy.mesh.position.x, enemy.mesh.position.y, .38);
  scene.add(mesh);
  lootDrops.push({ mesh, item });
}

function updateLootDrops(delta: number) {
  for (const drop of [...lootDrops]) {
    drop.mesh.rotation.z += delta * 2.4;
    drop.mesh.position.z = .38 + Math.sin(performance.now() * .005) * .08;
    if (drop.mesh.position.distanceTo(player.position) > 1.25) continue;
    const current = equipment[drop.item.slot];
    if (!current || drop.item.score >= current.score) {
      equipment[drop.item.slot] = drop.item;
      rebuildRunStats();
      latestLoot = drop.item.name + " · " + drop.item.description;
    } else {
      latestLoot = "Discarded " + drop.item.name;
    }
    scene.remove(drop.mesh);
    lootDrops.splice(lootDrops.indexOf(drop), 1);
  }
}

function spawnEnemy(x: number, y: number, tier: Enemy["tier"] = "mob") {
  const group = new THREE.Group();
  const isBoss = tier === "boss";
  const isMiniBoss = tier === "miniBoss";
  const color = isBoss ? "#dc416c" : isMiniBoss ? "#f09b38" : "#9d63df";
  const accent = isBoss ? "#ffb0cc" : isMiniBoss ? "#ffd48b" : "#d8b6ff";
  const size = isBoss ? 1.5 : isMiniBoss ? 1.16 : .88;
  const height = isBoss ? 1.72 : isMiniBoss ? 1.34 : 1.08;
  const radius = isBoss ? 1.15 : isMiniBoss ? .9 : .7;

  const enemyShadow = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 16),
    new THREE.MeshBasicMaterial({ color: "#080b12", transparent: true, opacity: .52, depthWrite: false }),
  );
  enemyShadow.scale.y = .58;

  const enemyBody = new THREE.Mesh(
    new THREE.DodecahedronGeometry(size * .62, isBoss ? 1 : 0),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: isBoss ? .28 : .1,
      roughness: .58,
      metalness: isBoss ? .3 : .08,
    }),
  );
  enemyBody.name = "enemy-body";
  enemyBody.scale.set(1, .86, height / size);
  enemyBody.position.z = height * .56;
  enemyBody.castShadow = true;

  const eyeMaterial = new THREE.MeshBasicMaterial({ color: accent, toneMapped: false });
  const eyeLeft = new THREE.Mesh(new THREE.BoxGeometry(.13, .08, .11), eyeMaterial);
  eyeLeft.position.set(size * .47, -.16, height * .68);
  const eyeRight = eyeLeft.clone();
  eyeRight.position.y = .16;

  const aura = new THREE.Mesh(
    new THREE.RingGeometry(radius * .82, radius, 24),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: isBoss ? .65 : .26,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      side: THREE.DoubleSide,
    }),
  );
  aura.name = "enemy-aura";
  aura.position.z = .04;

  group.add(enemyShadow, aura, enemyBody, eyeLeft, eyeRight);

  if (isMiniBoss || isBoss) {
    const hornGeometry = new THREE.ConeGeometry(isBoss ? .22 : .16, isBoss ? .85 : .55, 5);
    const hornMaterial = new THREE.MeshStandardMaterial({ color: accent, emissive: color, emissiveIntensity: .35, roughness: .45 });
    const hornLeft = new THREE.Mesh(hornGeometry, hornMaterial);
    hornLeft.position.set(-.38, 0, height + .15);
    hornLeft.rotation.z = -.35;
    const hornRight = hornLeft.clone();
    hornRight.position.x = .38;
    hornRight.rotation.z = .35;
    group.add(hornLeft, hornRight);
  }

  if (isBoss) {
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(.34, 0),
      new THREE.MeshBasicMaterial({ color: "#fff0b8", toneMapped: false }),
    );
    core.name = "enemy-core";
    core.position.set(0, 0, height * .55);
    group.add(core);
    const light = new THREE.PointLight(color, 9, 5, 2);
    light.position.z = height;
    group.add(light);
  }

  const lifeBg = new THREE.Mesh(new THREE.PlaneGeometry(radius * 1.8, .12), new THREE.MeshBasicMaterial({ color: "#241c2a" }));
  lifeBg.position.set(0, height + .42, .25);
  const life = new THREE.Mesh(new THREE.PlaneGeometry(radius * 1.72, .08), new THREE.MeshBasicMaterial({ color: "#77e5a6" }));
  life.position.set(0, height + .42, .26);
  life.name = "life";
  group.add(lifeBg, life);
  group.position.set(x, y, 0);
  scene.add(group);

  const maxHealth = tier === "boss" ? 330 + floor * 78 : tier === "miniBoss" ? 150 + floor * 35 : 48 + floor * 13;
  const speed = tier === "boss" ? .72 + floor * .015 : tier === "miniBoss" ? .86 + floor * .017 : 1 + floor * .018;
  enemies.push({ mesh: group, health: maxHealth, maxHealth, speed, radius, attackTimer: .8, tier });
}
function refreshFloorMap() {
  scene.remove(floorMap);
  floorMap = createPixelWorld(scene, floor);
}

function enterLobby() {
  for (const enemy of enemies.splice(0)) scene.remove(enemy.mesh);
  scene.remove(floorMap);
  floorMap = createLobbyWorld(scene);
  royaleOverlay!.hidden = true;
  gameState = "lobby";
  classMenuOpen = false;
  lobbyMessage = "Explore the village · E to interact";
  player.position.set(0, 0, 0);
  updateClassHud();
}

function startFloor() {
  gameState = "floorRush";
  classMenuOpen = false;
  refreshFloorMap();
  const isBossFloor = floor % 10 === 0;
  const isMiniBossFloor = floor % 5 === 0 && !isBossFloor;
  const spawnAroundPlayer = (index: number, count: number, tier: Enemy["tier"]) => {
    const angle = (Math.PI * 2 * index) / count + Math.random() * .4;
    const distance = tier === "boss" ? 9 : 7 + Math.random() * 5;
    spawnEnemy(player.position.x + Math.cos(angle) * distance, player.position.y + Math.sin(angle) * distance, tier);
  };

  if (isBossFloor) {
    spawnAroundPlayer(0, 1, "boss");
    return;
  }
  if (isMiniBossFloor) {
    spawnAroundPlayer(0, 1, "miniBoss");
    for (let index = 0; index < 3 + Math.floor(floor / 5); index += 1) spawnAroundPlayer(index + 1, 5, "mob");
    return;
  }
  const count = Math.min(3 + floor + Math.floor(Math.random() * 3), 18);
  for (let index = 0; index < count; index += 1) spawnAroundPlayer(index, count, "mob");
}

function startRoyalePractice() {
  for (const enemy of enemies.splice(0)) scene.remove(enemy.mesh);
  for (const drop of lootDrops.splice(0)) scene.remove(drop.mesh);
  gameState = "royale";
  classMenuOpen = false;
  scene.remove(floorMap);
  floorMap = createPixelWorld(scene, 71 + (royalMode === "solo" ? 1 : royalMode === "duo" ? 2 : 3));
  player.position.set(0, 0, 0);
  combat = new CombatState(kit.maxHealth);
  royaleEliminations = 0;
  royaleComplete = false;
  royaleOverlay!.hidden = true;
  const rivalCount = royalMode === "solo" ? 15 : royalMode === "duo" ? 11 : 7;
  for (let index = 0; index < rivalCount; index += 1) {
    const angle = (Math.PI * 2 * index) / rivalCount;
    const distance = 9 + (index % 3) * 1.8;
    spawnEnemy(Math.cos(angle) * distance, Math.sin(angle) * distance, index % 6 === 0 ? "miniBoss" : "mob");
  }
  lobbyMessage = "Royal practice started";
}

function resolveUpgrade(upgrade: Upgrade) {
  appliedUpgrades.push(upgrade);
  rebuildRunStats();
  upgradeOpen = false;
  upgradeOverlay!.hidden = true;
  combat.heal(22);
  combat.grantShield(12 * runStats.shieldMultiplier);

  if (floorRewardPending) {
    floorRewardPending = false;
    if (floor >= 40) {
      runComplete = true;
    } else {
      floor += 1;
      startFloor();
    }
  }
}

function openUpgradeSelection() {
  pendingChoices = drawUpgradeChoices();
  upgradeOpen = true;
  upgradeSecondsRemaining = 15;
  upgradeOverlay!.hidden = false;
  upgradeOverlay!.replaceChildren(...pendingChoices.map((upgrade) => {
    const card = document.createElement("button");
    card.className = "upgrade-card";
    card.innerHTML = "<small>FLOOR CLEARED · 15 SEC</small><strong>" + upgrade.title + "</strong><span>" + upgrade.description + "</span>";
    card.addEventListener("click", () => {
      if (upgradeOpen) resolveUpgrade(upgrade);
    });
    return card;
  }));
}

function updateUpgradeTimer(delta: number) {
  if (!upgradeOpen) return;
  upgradeSecondsRemaining -= delta;
  if (upgradeSecondsRemaining <= 0) {
    resolveUpgrade(pendingChoices[Math.floor(Math.random() * pendingChoices.length)]);
    return;
  }
  const label = upgradeOverlay!.querySelector("small");
  if (label) label.textContent = "FLOOR CLEARED · " + Math.ceil(upgradeSecondsRemaining) + " SEC";
}

function gainXp(amount: number) {
  runXp += amount;
  while (runXp >= xpToNextLevel) {
    runXp -= xpToNextLevel;
    runLevel += 1;
    xpToNextLevel = Math.floor(xpToNextLevel * 1.22);
  }
}

function restartFloorRush() {
  for (const enemy of enemies.splice(0)) scene.remove(enemy.mesh);
  floor = 1;
  runLevel = 1;
  runXp = 0;
  xpToNextLevel = 80;
  floorClearCountdown = -1;
  floorRewardPending = false;
  upgradeSecondsRemaining = 0;
  pendingChoices = [];
  appliedUpgrades.splice(0);
  for (const slot of Object.keys(equipment) as EquipmentSlot[]) delete equipment[slot];
  for (const drop of lootDrops.splice(0)) scene.remove(drop.mesh);
  rebuildRunStats();
  latestLoot = "—";
  runComplete = false;
  runStats = createRunStats();
  upgradeOpen = false;
  upgradeOverlay!.hidden = true;
  combat = new CombatState(kit.maxHealth);
  player.position.set(0, 0, 0);
  startFloor();
}

function addEffect(position: THREE.Vector2, radius: number, color: string, life = .34) {
  const mesh = new THREE.Mesh(new THREE.RingGeometry(Math.max(.12, radius * .62), radius, 20), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .92, side: THREE.DoubleSide }));
  mesh.position.set(position.x, position.y, .22);
  scene.add(mesh);
  effects.push({ mesh, life, maxLife: life });
}

function damageEnemy(enemy: Enemy, amount: number, color: string) {
  enemy.health = Math.max(0, enemy.health - amount);
  const life = enemy.mesh.getObjectByName("life") as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | undefined;
  if (life) life.scale.x = enemy.health / enemy.maxHealth;
  addEffect(new THREE.Vector2(enemy.mesh.position.x, enemy.mesh.position.y), enemy.radius + .18, color, .18);
  vfx.impact(enemy.mesh.position, color, enemy.tier === "boss" ? 18 : enemy.tier === "miniBoss" ? 12 : 7);
  triggerImpact(enemy.tier === "boss" ? 1.7 : enemy.tier === "miniBoss" ? 1.15 : .5, color);
  if (enemy.health <= 0) {
    spawnLoot(enemy);
    if (gameState === "royale") royaleEliminations += 1;
    gainXp(enemy.tier === "boss" ? 110 + floor * 14 : enemy.tier === "miniBoss" ? 46 + floor * 6 : 16 + floor * 2);
    scene.remove(enemy.mesh);
    enemies.splice(enemies.indexOf(enemy), 1);
  }
}

function damageInArea(center: THREE.Vector2, radius: number, damage: number, color: string) {
  addEffect(center, radius, color);
  vfx.ring(new THREE.Vector3(center.x, center.y, 0), radius, color);
  for (const enemy of [...enemies]) {
    const distance = center.distanceTo(new THREE.Vector2(enemy.mesh.position.x, enemy.mesh.position.y));
    if (distance <= radius + enemy.radius) damageEnemy(enemy, damage, color);
  }
}

function fireProjectile(damage: number, color: string, speed = 16, radius = .16, style = "basic") {
  const direction = new THREE.Vector2(aimWorld.x - player.position.x, aimWorld.y - player.position.y);
  if (direction.lengthSq() < .001) direction.set(Math.cos(player.rotation.z), Math.sin(player.rotation.z));
  direction.normalize();

  let geometry: THREE.BufferGeometry;
  if (style.includes("arrow") || style === "ranger") {
    geometry = new THREE.BoxGeometry(radius * 4.8, radius * .72, radius * .46);
  } else if (style.includes("shuriken") || style === "assassin") {
    geometry = new THREE.OctahedronGeometry(radius * 1.55, 0);
  } else if (style.includes("orb") || style === "arcanist") {
    geometry = new THREE.IcosahedronGeometry(radius * 1.42, 1);
  } else {
    geometry = new THREE.SphereGeometry(radius * 1.12, 8, 6);
  }

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: .96,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  mesh.rotation.z = Math.atan2(direction.y, direction.x);
  mesh.position.set(player.position.x + direction.x * .78, player.position.y + direction.y * .78, .52);
  if (style.includes("orb") || style === "arcanist") {
    const light = new THREE.PointLight(color, 8, 4, 2);
    mesh.add(light);
  }
  scene.add(mesh);
  vfx.skillCast(mesh.position, color, .46);
  projectiles.push({
    mesh,
    velocity: direction.multiplyScalar(speed),
    damage,
    life: 1.35,
    radius,
    style,
    trailTimer: 0,
  });
}

let kit: ClassKit = CLASS_KITS.warden;
let combat = new CombatState(kit.maxHealth);
let dashRemaining = 0;
let dashCooldownRemaining = 0;
let dashAfterimageTimer = 0;
const dashDirection = new THREE.Vector2(1, 0);
let hasteRemaining = 0;
let hitStopRemaining = 0;
let cameraShake = 0;

const keys = new Set<string>();
const mouse = new THREE.Vector2();
const aimWorld = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const ground = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const moveDirection = new THREE.Vector2();

function triggerImpact(intensity: number, color: string) {
  hitStopRemaining = Math.max(hitStopRemaining, .018 * intensity);
  cameraShake = Math.max(cameraShake, intensity);
  impactFlash!.style.background = color;
  impactFlash!.classList.remove("active");
  void impactFlash!.offsetWidth;
  impactFlash!.classList.add("active");
}

function updateAim() {
  raycaster.setFromCamera(mouse, camera);
  raycaster.ray.intersectPlane(ground, aimWorld);
  cursor.position.set(aimWorld.x, aimWorld.y, .1);
  player.rotation.z = Math.atan2(aimWorld.y - player.position.y, aimWorld.x - player.position.x);
}

function getMoveDirection() {
  moveDirection.set(0, 0);
  if (keys.has("KeyW")) moveDirection.y += 1;
  if (keys.has("KeyS")) moveDirection.y -= 1;
  if (keys.has("KeyA")) moveDirection.x -= 1;
  if (keys.has("KeyD")) moveDirection.x += 1;
  moveDirection.normalize();
  const screenRight = new THREE.Vector2(Math.cos(cameraYaw), Math.sin(cameraYaw));
  const screenForward = new THREE.Vector2(-Math.sin(cameraYaw), Math.cos(cameraYaw));
  return screenRight.multiplyScalar(moveDirection.x).add(screenForward.multiplyScalar(moveDirection.y));
}

function startDash(multiplier = 1) {
  if (upgradeOpen) return;
  if (dashCooldownRemaining > 0 || dashRemaining > 0) return;
  const direction = getMoveDirection();
  dashDirection.copy(direction.lengthSq() === 0 ? new THREE.Vector2(Math.cos(player.rotation.z), Math.sin(player.rotation.z)) : direction);
  dashRemaining = .13 * multiplier;
  dashAfterimageTimer = 0;
  vfx.dash(player.position, kit.color, dashDirection);
  triggerImpact(.55 * multiplier, kit.color);
  dashCooldownRemaining = 3 * runStats.dashCooldownMultiplier;
}

function useAbility(ability: AbilityDefinition) {
  if (upgradeOpen) return;
  if (!combat.canUse(ability.id)) return;
  combat.startCooldown(ability.id, ability.cooldown * (1 - runStats.cooldownReduction));
  const target = new THREE.Vector2(aimWorld.x, aimWorld.y);
  const playerPoint = new THREE.Vector2(player.position.x, player.position.y);
  vfx.skillCast(new THREE.Vector3(player.position.x, player.position.y, 0), kit.color, ability.kind === "area" ? 1.35 : 1);

  switch (ability.kind) {
    case "projectile":
      fireProjectile(
        ability.damage * (1 + (runLevel - 1) * .08) * runStats.damageMultiplier,
        kit.color,
        ability.id === "piercing-arrow" ? 23 : 18,
        (ability.id === "piercing-arrow" ? .25 : .18) * runStats.projectileSizeMultiplier,
        ability.id,
      );
      break;
    case "shield":
      combat.grantShield(55 * runStats.shieldMultiplier);
      addEffect(playerPoint, 1.2, "#65c9ff", .55);
      vfx.abilityImpact(new THREE.Vector3(playerPoint.x, playerPoint.y, 0), "#65c9ff", ability.id, 1.2);
      break;
    case "dash":
      startDash(ability.id === "shadow-step" ? 1.7 : 1.35);
      damageInArea(playerPoint, 1.35, ability.damage * (1 + (runLevel - 1) * .08) * runStats.damageMultiplier, kit.color);
      vfx.abilityImpact(new THREE.Vector3(playerPoint.x, playerPoint.y, 0), kit.color, ability.id, 1.35);
      break;
    case "stealth":
      hasteRemaining = 2.4;
      body.material.opacity = .38;
      body.material.transparent = true;
      fireProjectile(ability.damage * (1 + (runLevel - 1) * .08) * runStats.damageMultiplier, kit.color, 19, .22, ability.id);
      break;
    default:
      damageInArea(target, ability.range, ability.damage * (1 + (runLevel - 1) * .08) * runStats.damageMultiplier, kit.color);
      vfx.abilityImpact(new THREE.Vector3(target.x, target.y, 0), kit.color, ability.id, ability.range);
      break;
  }
}

function usePotion() {
  if (upgradeOpen) return;
  if (!combat.canUse("potion")) return;
  combat.startCooldown("potion", 12);
  combat.heal(48 * runStats.potionMultiplier);
  addEffect(new THREE.Vector2(player.position.x, player.position.y), 1, "#77e5a6", .45);
}

function useShield() {
  if (upgradeOpen) return;
  if (!combat.canUse("shield-item")) return;
  combat.startCooldown("shield-item", 14);
  combat.grantShield(42 * runStats.shieldMultiplier);
  addEffect(new THREE.Vector2(player.position.x, player.position.y), 1.25, "#65c9ff", .55);
}

function spawnBoss() {
  if (upgradeOpen) return;
  if (!combat.canUse("boss-spawner")) return;
  combat.startCooldown("boss-spawner", 30);
  const target = new THREE.Vector2(aimWorld.x, aimWorld.y);
  addEffect(target, 1.2, "#ffbe5c", .8);
  vfx.bossSummon(new THREE.Vector3(target.x, target.y, 0));
  window.setTimeout(() => spawnEnemy(target.x, target.y, "boss"), 600);
}

function rebuildClassVisual() {
  classAccent.clear();
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: kit.color,
    emissive: kit.color,
    emissiveIntensity: .34,
    roughness: .42,
    metalness: .34,
  });
  const glowMaterial = new THREE.MeshBasicMaterial({ color: kit.color, toneMapped: false });

  if (kit.id === "warden") {
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(.38, .38, .13, 10), accentMaterial);
    shield.name = "class-shield";
    shield.rotation.z = Math.PI / 2;
    shield.position.set(.65, 0, .72);
    const boss = new THREE.Mesh(new THREE.OctahedronGeometry(.12, 0), glowMaterial);
    boss.position.set(.73, 0, .72);
    classAccent.add(shield, boss);
  } else if (kit.id === "assassin") {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(.62, .075, .09), accentMaterial);
    blade.position.set(.48, -.42, .64);
    blade.rotation.z = -.48;
    const secondBlade = blade.clone();
    secondBlade.position.y = .42;
    secondBlade.rotation.z = .48;
    classAccent.add(blade, secondBlade);
  } else if (kit.id === "ranger") {
    const bow = new THREE.Mesh(new THREE.TorusGeometry(.38, .045, 6, 20, Math.PI * 1.45), accentMaterial);
    bow.name = "class-bow";
    bow.rotation.y = Math.PI / 2;
    bow.rotation.z = -.72;
    bow.position.set(.62, 0, .72);
    const arrow = new THREE.Mesh(new THREE.BoxGeometry(.78, .045, .045), glowMaterial);
    arrow.position.set(.72, 0, .72);
    classAccent.add(bow, arrow);
  } else {
    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(.22, 1), glowMaterial);
    orb.name = "class-orb";
    orb.position.set(.72, 0, 1.05);
    const orbLight = new THREE.PointLight(kit.color, 7, 3.5, 2);
    orb.add(orbLight);
    classAccent.add(orb);
  }
}

function updateClassHud() {
  classStatus!.textContent = kit.name.toUpperCase();
  classStatus!.style.color = kit.color;
  body.material.color.set(kit.color);
  rebuildClassVisual();
  classPicker!.hidden = gameState !== "lobby" || !classMenuOpen;
  classPicker!.replaceChildren(...(Object.values(CLASS_KITS).map((nextKit) => {
    const button = document.createElement("button");
    button.textContent = nextKit.name.replace("Solaris ", "").replace("Astral ", "");
    button.style.setProperty("--class-color", nextKit.color);
    button.classList.toggle("active", nextKit.id === kit.id);
    button.addEventListener("click", () => {
      kit = nextKit;
      combat = new CombatState(kit.maxHealth);
      updateClassHud();
    });
    return button;
  })));
}

function updateAbilityHud() {
  const entries = [
    ...kit.abilities.map((ability) => ({ key: ability.key, name: ability.name, cooldown: combat.cooldownRemaining(ability.id) })),
    { key: "5", name: "Potion", cooldown: combat.cooldownRemaining("potion") },
    { key: "6", name: "Shield", cooldown: combat.cooldownRemaining("shield-item") },
    { key: "7", name: "Boss Spawner", cooldown: combat.cooldownRemaining("boss-spawner") },
  ];
  abilitiesHud!.replaceChildren(...entries.map((entry) => {
    const item = document.createElement("span");
    item.className = entry.cooldown > 0 ? "cooldown" : "";
    item.innerHTML = "<b>" + entry.key + "</b>" + entry.name + (entry.cooldown > 0 ? " · " + entry.cooldown.toFixed(1) : "");
    return item;
  }));
}

updateClassHud();

function openRoyaleSetup() {
  royaleOverlay!.hidden = false;
  royalModeButtons.forEach((button) => button.classList.toggle("active", button.dataset.royalMode === royalMode));
}

function setPauseMenu(open: boolean) {
  pauseOpen = open;
  pauseOverlay!.hidden = !open;
  if (open) keys.clear();
}

function tryLobbyInteraction() {
  if (gameState !== "lobby") return;
  const position = new THREE.Vector2(player.position.x, player.position.y);
  if (position.distanceTo(LOBBY_POINTS.hut) < 3) {
    classMenuOpen = !classMenuOpen;
    lobbyMessage = classMenuOpen ? "Choose your class inside the hut" : "Hut closed";
    updateClassHud();
    return;
  }
  if (position.distanceTo(LOBBY_POINTS.floorPortal) < 2.8) {
    lobbyMessage = "Entering Floor Rush";
    restartFloorRush();
    return;
  }
  if (position.distanceTo(LOBBY_POINTS.royalDragon) < 3) {
    lobbyMessage = "Choose your Solara Royale queue";
    openRoyaleSetup();
    return;
  }
  lobbyMessage = "Move closer to the hut, hell portal or dragon monument";
}

royalModeButtons.forEach((button) => button.addEventListener("click", () => {
  royalMode = button.dataset.royalMode as RoyalMode;
  openRoyaleSetup();
}));
royalCloseButton!.addEventListener("click", () => { royaleOverlay!.hidden = true; });
royalStartButton!.addEventListener("click", startRoyalePractice);

resumeButton!.addEventListener("click", () => setPauseMenu(false));
villageButton!.addEventListener("click", () => {
  setPauseMenu(false);
  enterLobby();
});
cameraSensitivityInput!.addEventListener("input", () => {
  cameraSensitivity = Number(cameraSensitivityInput!.value);
});
pixelScaleInput!.addEventListener("input", () => {
  pixelScale = Number(pixelScaleInput!.value);
  resizeCamera();
});

inviteButton!.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    lobbyMessage = "Local invite link copied · real friends need the multiplayer server";
  } catch {
    lobbyMessage = "Real friend invites will activate with multiplayer";
  }
});

window.addEventListener("keydown", (event) => {
  const controls = ["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "KeyE", "Escape"];
  if (controls.includes(event.code)) event.preventDefault();
  if (event.code === "Escape") {
    if (event.repeat) return;
    if (!royaleOverlay!.hidden) royaleOverlay!.hidden = true;
    else setPauseMenu(!pauseOpen);
    return;
  }
  if (pauseOpen) return;
  keys.add(event.code);
  if (event.repeat) return;
  if (event.code === "KeyE") tryLobbyInteraction();
  if (event.code === "ShiftLeft" || event.code === "ShiftRight") startDash(kit.dashDistanceMultiplier);
  const abilitiesByKey: Record<string, AbilityDefinition | undefined> = { Digit1: kit.abilities[0], Digit2: kit.abilities[1], Digit3: kit.abilities[2], Digit4: kit.abilities[3] };
  const selectedAbility = abilitiesByKey[event.code];
  if (selectedAbility) useAbility(selectedAbility);
  if (event.code === "Digit5") usePotion();
  if (event.code === "Digit6") useShield();
  if (event.code === "Digit7") spawnBoss();
  if (event.code === "Enter" && !combat.snapshot.alive) restartFloorRush();
});

window.addEventListener("keyup", (event) => keys.delete(event.code));
renderer.domElement.addEventListener("contextmenu", (event) => event.preventDefault());
renderer.domElement.addEventListener("pointermove", (event) => {
  if (isCameraRotating) {
    cameraYaw -= event.movementX * .008 * cameraSensitivity;
    cameraPitch = THREE.MathUtils.clamp(cameraPitch + event.movementY * .006 * cameraSensitivity, THREE.MathUtils.degToRad(35), THREE.MathUtils.degToRad(65));
    return;
  }
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});
renderer.domElement.addEventListener("pointerdown", (event) => {
  if (event.button === 2) {
    isCameraRotating = true;
    renderer.domElement.setPointerCapture(event.pointerId);
    return;
  }
  if (event.button === 0 && !pauseOpen && combat.canUse("basic-attack")) {
    combat.startCooldown("basic-attack", .38);
    fireProjectile(
      kit.basicAttackDamage * (1 + (runLevel - 1) * .08) * runStats.damageMultiplier,
      kit.id === "arcanist" ? kit.color : "#fff0d6",
      19,
      .13,
      kit.id,
    );
  }
});
renderer.domElement.addEventListener("pointerup", (event) => {
  if (event.button !== 2) return;
  isCameraRotating = false;
  if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
});
window.addEventListener("resize", resizeCamera);

let lastTime = performance.now();
function updateProjectiles(delta: number) {
  for (const projectile of [...projectiles]) {
    projectile.life -= delta;
    projectile.trailTimer -= delta;
    projectile.mesh.position.x += projectile.velocity.x * delta;
    projectile.mesh.position.y += projectile.velocity.y * delta;
    projectile.mesh.rotation.x += delta * (projectile.style.includes("shuriken") ? 14 : 3);
    if (projectile.style.includes("shuriken")) projectile.mesh.rotation.z += delta * 18;
    if (projectile.trailTimer <= 0) {
      const trailPower = projectile.style.includes("arrow") ? 1.2 : projectile.style.includes("orb") ? 1.55 : .9;
      vfx.projectileTrail(projectile.mesh.position, projectile.mesh.material.color, trailPower);
      projectile.trailTimer = projectile.style.includes("orb") ? .018 : .028;
    }
    const hit = enemies.find((enemy) => projectile.mesh.position.distanceTo(enemy.mesh.position) < projectile.radius + enemy.radius);
    if (hit) {
      vfx.impact(projectile.mesh.position, projectile.mesh.material.color, hit.tier === "boss" ? 20 : 12, projectile.style.includes("orb") ? 1.45 : 1);
      damageEnemy(hit, projectile.damage, projectile.mesh.material.color.getStyle());
    }
    if (hit || projectile.life <= 0) {
      scene.remove(projectile.mesh);
      projectile.mesh.geometry.dispose();
      projectile.mesh.material.dispose();
      projectiles.splice(projectiles.indexOf(projectile), 1);
    }
  }
}

function updateEnemies(delta: number) {
  if (upgradeOpen) return;
  for (const enemy of enemies) {
    const direction = new THREE.Vector2(player.position.x - enemy.mesh.position.x, player.position.y - enemy.mesh.position.y);
    const distance = direction.length();
    if (distance > enemy.radius + .68) {
      direction.normalize().multiplyScalar(enemy.speed * delta);
      enemy.mesh.position.x += direction.x;
      enemy.mesh.position.y += direction.y;
    }
    const enemyBody = enemy.mesh.getObjectByName("enemy-body");
    const enemyAura = enemy.mesh.getObjectByName("enemy-aura");
    const enemyCore = enemy.mesh.getObjectByName("enemy-core");
    if (enemyBody) {
      enemyBody.rotation.z += delta * (enemy.tier === "boss" ? .65 : .32);
      enemyBody.position.z += Math.sin(performance.now() * .004 + enemy.mesh.id) * delta * .11;
    }
    if (enemyAura) enemyAura.rotation.z -= delta * (enemy.tier === "boss" ? 1.4 : .55);
    if (enemyCore) {
      enemyCore.rotation.x += delta * 2.5;
      enemyCore.rotation.z += delta * 3.2;
    }
    enemy.attackTimer -= delta;
    if (distance < enemy.radius + .82 && enemy.attackTimer <= 0) {
      combat.takeDamage(enemy.tier === "boss" ? 15 + floor : enemy.tier === "miniBoss" ? 10 + floor * .45 : 7 + floor * .18);
      enemy.attackTimer = enemy.tier === "boss" ? .8 : enemy.tier === "miniBoss" ? .95 : 1.1;
      addEffect(new THREE.Vector2(player.position.x, player.position.y), .85, "#dc5c7a", .22);
      triggerImpact(enemy.tier === "boss" ? 1.35 : .65, "#dc5c7a");
    }
  }
}

function updateFloorRush(delta: number) {
  if (gameState !== "floorRush") return;
  if (!combat.snapshot.alive || runComplete || upgradeOpen) return;
  if (enemies.length > 0) {
    floorClearCountdown = -1;
    return;
  }
  if (floorClearCountdown < 0) {
    floorClearCountdown = 2;
    return;
  }
  floorClearCountdown -= delta;
  if (floorClearCountdown <= 0) {
    floorClearCountdown = -1;
    floorRewardPending = true;
    openUpgradeSelection();
  }
}

function updateEffects(delta: number) {
  for (const effect of [...effects]) {
    effect.life -= delta;
    effect.mesh.material.opacity = Math.max(0, effect.life / effect.maxLife);
    const scale = 1 + (1 - effect.life / effect.maxLife) * .45;
    effect.mesh.scale.setScalar(scale);
    if (effect.life <= 0) {
      scene.remove(effect.mesh);
      effects.splice(effects.indexOf(effect), 1);
    }
  }
}

function updateHud() {
  const snapshot = combat.snapshot;
  healthFill!.style.width = (snapshot.health / snapshot.maxHealth) * 100 + "%";
  shieldFill!.style.width = (snapshot.shield / snapshot.maxShield) * 100 + "%";
  healthStatus!.textContent = Math.ceil(snapshot.health) + " / " + snapshot.maxHealth;
  floorStatus!.textContent = gameState === "lobby"
    ? "SOLARA VILLAGE · " + kit.name
    : gameState === "royale"
      ? "SOLARA ROYALE · " + royalMode.toUpperCase() + " · RIVALS " + enemies.length
      : !combat.snapshot.alive
      ? "RUN ENDED · ENTER TO RESTART"
      : runComplete
        ? "40 FLOORS CLEARED · FLOOR RUSH COMPLETE"
        : "FLOOR " + floor + " · LEVEL " + runLevel + " · XP " + runXp + "/" + xpToNextLevel;
  dashStatus!.textContent = dashCooldownRemaining <= 0 ? "DASH READY" : "DASH " + Math.round((1 - dashCooldownRemaining / 3) * 100) + "%";
  dashStatus!.style.color = dashCooldownRemaining <= 0 ? "#ffb257" : "#9cabb7";
  positionStatus!.textContent = "X " + Math.round(player.position.x) + " · Y " + Math.round(player.position.y);
  lootStatus!.textContent = gameState === "lobby" ? "CLASS: " + kit.name : "LOOT: " + latestLoot;
  if (gameState === "lobby") {
    const position = new THREE.Vector2(player.position.x, player.position.y);
    if (position.distanceTo(LOBBY_POINTS.hut) < 3) lobbyMessage = classMenuOpen ? "Class selection open · E to close" : "Press E to enter your hut";
    else if (position.distanceTo(LOBBY_POINTS.floorPortal) < 2.8) lobbyMessage = "Press E: Floor Rush · The Hell Gate";
    else if (position.distanceTo(LOBBY_POINTS.royalDragon) < 3) lobbyMessage = "Press E: Solara Royale · Dragon Monument";
  }
  interactionStatus!.textContent = lobbyMessage;
  if (gameState === "lobby") {
    objectiveStatus!.textContent = "OBJECTIVE · Explore · E to interact";
  } else if (gameState === "royale" && royaleComplete) {
    objectiveStatus!.textContent = "ROYAL VICTORY · " + royaleEliminations + " rivals defeated · ESC menu";
  } else if (gameState === "royale" && !combat.snapshot.alive) {
    objectiveStatus!.textContent = "ROYAL ELIMINATED · " + royaleEliminations + " rivals defeated · ESC menu";
  } else if (gameState === "royale") {
    objectiveStatus!.textContent = "ROYAL PRACTICE · Defeat all rivals · " + enemies.length + " remaining · ESC menu";
  } else if (!combat.snapshot.alive) {
    objectiveStatus!.textContent = "RUN FAILED · Press ESC for menu";
  } else if (runComplete) {
    objectiveStatus!.textContent = "FLOOR RUSH COMPLETE · Press ESC for menu";
  } else {
    const special = floor % 10 === 0 ? "BOSS FLOOR" : floor % 5 === 0 ? "MINI BOSS FLOOR" : "CLEAR THE ARENA";
    objectiveStatus!.textContent = "OBJECTIVE · " + special + " · " + enemies.length + " foes remaining · ESC menu";
  }
  updateAbilityHud();
}

function render(now: number) {
  const delta = Math.min((now - lastTime) / 1000, .05);
  lastTime = now;
  const inHitStop = hitStopRemaining > 0;
  hitStopRemaining = Math.max(0, hitStopRemaining - delta);
  const simulationDelta = pauseOpen || inHitStop ? 0 : delta;
  cameraShake = Math.max(0, cameraShake - delta * 7);
  if (!upgradeOpen && !pauseOpen) combat.update(simulationDelta);
  updateUpgradeTimer(simulationDelta);
  dashCooldownRemaining = Math.max(0, dashCooldownRemaining - simulationDelta);
  hasteRemaining = Math.max(0, hasteRemaining - simulationDelta);
  if (hasteRemaining <= 0) body.material.opacity = 1;

  const direction = getMoveDirection();
  const speed = kit.moveSpeed * (hasteRemaining > 0 ? 1.3 : 1) * (1 + runStats.moveSpeedBonus);
  if (dashRemaining > 0) {
    player.position.x += dashDirection.x * 24 * simulationDelta;
    player.position.y += dashDirection.y * 24 * simulationDelta;
    dashRemaining -= simulationDelta;
    body.material.color.set("#fff0d6");
    dashAfterimageTimer -= simulationDelta;
    if (dashAfterimageTimer <= 0) {
      vfx.afterimage(player.position, player.rotation.z, kit.color);
      dashAfterimageTimer = .028;
    }
  } else {
    player.position.x += direction.x * speed * simulationDelta;
    player.position.y += direction.y * speed * simulationDelta;
    body.material.color.set(kit.color);
  }

  body.position.z = .62 + Math.sin(now * .008) * .025;
  const classOrb = classAccent.getObjectByName("class-orb");
  if (classOrb) {
    classOrb.rotation.x += simulationDelta * 2.4;
    classOrb.rotation.z += simulationDelta * 3.6;
    classOrb.position.z = 1.05 + Math.sin(now * .006) * .1;
  }

  updateAim();
  updateProjectiles(simulationDelta);
  updateLootDrops(simulationDelta);
  updateEnemies(simulationDelta);
  updateFloorRush(simulationDelta);
  if (gameState === "royale" && enemies.length === 0) royaleComplete = true;
  updateEffects(simulationDelta);
  vfx.update(simulationDelta);

  const lobbyPortal = gameState === "lobby" ? floorMap.getObjectByName("floor-rush-portal") : undefined;
  const energyRing = lobbyPortal?.getObjectByName("portal-energy");
  if (energyRing) {
    energyRing.rotation.z += simulationDelta * 2.4;
    const pulse = 1 + Math.sin(now * .006) * .07;
    energyRing.scale.setScalar(pulse);
  }

  const cameraTarget = new THREE.Vector3(player.position.x, player.position.y, .35);
  const horizontalDistance = CAMERA_DISTANCE * Math.cos(cameraPitch);
  const height = CAMERA_DISTANCE * Math.sin(cameraPitch);
  const shakeX = (Math.random() - .5) * cameraShake * .22;
  const shakeY = (Math.random() - .5) * cameraShake * .22;
  camera.position.set(
    player.position.x + Math.sin(cameraYaw) * horizontalDistance + shakeX,
    player.position.y - Math.cos(cameraYaw) * horizontalDistance + shakeY,
    height + cameraShake * .06,
  );
  camera.lookAt(cameraTarget);
  updateHud();

  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

requestAnimationFrame(render);
