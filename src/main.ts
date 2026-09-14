import * as THREE from "three";
import { CLASS_KITS, type AbilityDefinition, type ClassKit, type PlayerClassId } from "./game/classKits";
import { CombatState } from "./game/combatState";
import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");
const classPicker = document.querySelector<HTMLDivElement>("#class-picker");
const abilitiesHud = document.querySelector<HTMLElement>("#abilities");
const dashStatus = document.querySelector<HTMLSpanElement>("#dash-status");
const positionStatus = document.querySelector<HTMLSpanElement>("#position-status");
const classStatus = document.querySelector<HTMLSpanElement>("#class-status");
const healthStatus = document.querySelector<HTMLSpanElement>("#health-status");
const healthFill = document.querySelector<HTMLElement>("#health-fill");
const shieldFill = document.querySelector<HTMLElement>("#shield-fill");

if (!app || !classPicker || !abilitiesHud || !dashStatus || !positionStatus || !classStatus || !healthStatus || !healthFill || !shieldFill) {
  throw new Error("Solara HUD could not be created.");
}

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
const PIXEL_SCALE = .82;
renderer.setPixelRatio(1);
renderer.setSize(Math.floor(window.innerWidth * PIXEL_SCALE), Math.floor(window.innerHeight * PIXEL_SCALE), false);
renderer.domElement.style.width = "100vw";
renderer.domElement.style.height = "100vh";
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color("#101725");

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, .1, 100);
camera.position.set(0, 0, 10);

function resizeCamera() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(Math.floor(window.innerWidth * PIXEL_SCALE), Math.floor(window.innerHeight * PIXEL_SCALE), false);
}
resizeCamera();

const CAMERA_DISTANCE = 17;
let cameraYaw = Math.PI / 4;
let cameraPitch = THREE.MathUtils.degToRad(50);
let isCameraRotating = false;

const arena = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshBasicMaterial({ color: "#1b2b35" }));
scene.add(arena);
const grid = new THREE.GridHelper(80, 80, "#3e5960", "#29434a");
grid.rotation.x = Math.PI / 2;
grid.position.z = 0.01;
scene.add(grid);

function addObstacle(x: number, y: number, width: number, height: number, color = "#374957") {
  const obstacle = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.35), new THREE.MeshBasicMaterial({ color }));
  obstacle.position.set(x, y, 0.2);
  scene.add(obstacle);
}
addObstacle(-7, 4, 5, 1.2);
addObstacle(8, -4, 3, 4);
addObstacle(-3, -7, 6, 1);
addObstacle(8, 5, 2.5, 2.5, "#54454f");

function addTree(x: number, y: number, scale = 1) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(.32 * scale, .32 * scale, 1.1 * scale), new THREE.MeshBasicMaterial({ color: "#5d4130" }));
  trunk.position.z = .55 * scale;
  const leaves = new THREE.Mesh(new THREE.BoxGeometry(1.18 * scale, 1.18 * scale, .8 * scale), new THREE.MeshBasicMaterial({ color: "#3d805b" }));
  leaves.position.z = 1.35 * scale;
  const highlight = new THREE.Mesh(new THREE.BoxGeometry(.78 * scale, .78 * scale, .24 * scale), new THREE.MeshBasicMaterial({ color: "#70b875" }));
  highlight.position.set(-.12 * scale, -.12 * scale, 1.82 * scale);
  tree.add(trunk, leaves, highlight);
  tree.position.set(x, y, 0);
  scene.add(tree);
}
[[-10, 7, 1.1], [-8, -1, .8], [-1, 8, 1], [6, 7, .9], [11, 2, 1.15], [10, -8, .9], [-9, -8, 1], [3, -9, .75]]
  .forEach(([x, y, scale]) => addTree(x, y, scale));

const player = new THREE.Group();
const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.72, 8), new THREE.MeshBasicMaterial({ color: "#081019", transparent: true, opacity: 0.55 }));
shadow.scale.set(1.15, 0.62, 1);
const body = new THREE.Mesh(new THREE.BoxGeometry(.88, .88, 1.06), new THREE.MeshBasicMaterial({ color: "#ff9f43" }));
body.position.z = .62;
const facing = new THREE.Mesh(new THREE.BoxGeometry(.16, .82, .18), new THREE.MeshBasicMaterial({ color: "#fff0d6" }));
facing.position.set(.62, 0, .68);
player.add(shadow, body, facing);
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
  boss: boolean;
};

type Projectile = {
  mesh: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  velocity: THREE.Vector2;
  damage: number;
  life: number;
  radius: number;
};

type Effect = { mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>; life: number; maxLife: number };

const enemies: Enemy[] = [];
const projectiles: Projectile[] = [];
const effects: Effect[] = [];

function spawnEnemy(x: number, y: number, boss = false) {
  const group = new THREE.Group();
  const color = boss ? "#dc5c7a" : "#a773d9";
  const enemyShadow = new THREE.Mesh(new THREE.CircleGeometry(boss ? 1.15 : 0.66, 8), new THREE.MeshBasicMaterial({ color: "#080b12", transparent: true, opacity: .48 }));
  enemyShadow.scale.y = .62;
  const enemyBody = new THREE.Mesh(new THREE.BoxGeometry(boss ? 1.5 : .88, boss ? 1.5 : .88, boss ? 1.55 : 1.02), new THREE.MeshBasicMaterial({ color }));
  enemyBody.position.z = boss ? .85 : .6;
  const lifeBg = new THREE.Mesh(new THREE.PlaneGeometry(boss ? 2 : 1.1, .12), new THREE.MeshBasicMaterial({ color: "#241c2a" }));
  lifeBg.position.set(0, boss ? 1.4 : .82, .25);
  const life = new THREE.Mesh(new THREE.PlaneGeometry(boss ? 1.94 : 1.04, .08), new THREE.MeshBasicMaterial({ color: "#77e5a6" }));
  life.position.set(0, boss ? 1.4 : .82, .26);
  life.name = "life";
  group.add(enemyShadow, enemyBody, lifeBg, life);
  group.position.set(x, y, 0);
  scene.add(group);
  enemies.push({ mesh: group, health: boss ? 360 : 70, maxHealth: boss ? 360 : 70, speed: boss ? .7 : 1.05, radius: boss ? 1.15 : .7, attackTimer: .8, boss });
}

[[-4, 1], [3, 2], [5, -2], [-5, -4], [1, -5], [0, 5]].forEach(([x, y]) => spawnEnemy(x, y));

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
  if (enemy.health <= 0) {
    scene.remove(enemy.mesh);
    enemies.splice(enemies.indexOf(enemy), 1);
  }
}

function damageInArea(center: THREE.Vector2, radius: number, damage: number, color: string) {
  addEffect(center, radius, color);
  for (const enemy of [...enemies]) {
    const distance = center.distanceTo(new THREE.Vector2(enemy.mesh.position.x, enemy.mesh.position.y));
    if (distance <= radius + enemy.radius) damageEnemy(enemy, damage, color);
  }
}

function fireProjectile(damage: number, color: string, speed = 16, radius = .16) {
  const direction = new THREE.Vector2(aimWorld.x - player.position.x, aimWorld.y - player.position.y).normalize();
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 8), new THREE.MeshBasicMaterial({ color }));
  mesh.position.set(player.position.x + direction.x * .72, player.position.y + direction.y * .72, .3);
  scene.add(mesh);
  projectiles.push({ mesh, velocity: direction.multiplyScalar(speed), damage, life: 1.3, radius });
}

let kit: ClassKit = CLASS_KITS.warden;
let combat = new CombatState(kit.maxHealth);
let dashRemaining = 0;
let dashCooldownRemaining = 0;
const dashDirection = new THREE.Vector2(1, 0);
let hasteRemaining = 0;

const keys = new Set<string>();
const mouse = new THREE.Vector2();
const aimWorld = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const ground = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const moveDirection = new THREE.Vector2();

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
  if (dashCooldownRemaining > 0 || dashRemaining > 0) return;
  const direction = getMoveDirection();
  dashDirection.copy(direction.lengthSq() === 0 ? new THREE.Vector2(Math.cos(player.rotation.z), Math.sin(player.rotation.z)) : direction);
  dashRemaining = .13 * multiplier;
  dashCooldownRemaining = 3;
}

function useAbility(ability: AbilityDefinition) {
  if (!combat.canUse(ability.id)) return;
  combat.startCooldown(ability.id, ability.cooldown);
  const target = new THREE.Vector2(aimWorld.x, aimWorld.y);
  const playerPoint = new THREE.Vector2(player.position.x, player.position.y);

  switch (ability.kind) {
    case "projectile":
      fireProjectile(ability.damage, kit.color, ability.id === "piercing-arrow" ? 23 : 18, ability.id === "piercing-arrow" ? .25 : .18);
      break;
    case "shield":
      combat.grantShield(55);
      addEffect(playerPoint, 1.2, "#65c9ff", .55);
      break;
    case "dash":
      startDash(ability.id === "shadow-step" ? 1.7 : 1.35);
      damageInArea(playerPoint, 1.35, ability.damage, kit.color);
      break;
    case "stealth":
      hasteRemaining = 2.4;
      body.material.opacity = .38;
      body.material.transparent = true;
      fireProjectile(ability.damage, kit.color, 19, .22);
      break;
    default:
      damageInArea(target, ability.range, ability.damage, kit.color);
      break;
  }
}

function usePotion() {
  if (!combat.canUse("potion")) return;
  combat.startCooldown("potion", 12);
  combat.heal(48);
  addEffect(new THREE.Vector2(player.position.x, player.position.y), 1, "#77e5a6", .45);
}

function useShield() {
  if (!combat.canUse("shield-item")) return;
  combat.startCooldown("shield-item", 14);
  combat.grantShield(42);
  addEffect(new THREE.Vector2(player.position.x, player.position.y), 1.25, "#65c9ff", .55);
}

function spawnBoss() {
  if (!combat.canUse("boss-spawner")) return;
  combat.startCooldown("boss-spawner", 30);
  const target = new THREE.Vector2(aimWorld.x, aimWorld.y);
  addEffect(target, 1.2, "#ffbe5c", .8);
  window.setTimeout(() => spawnEnemy(target.x, target.y, true), 600);
}

function updateClassHud() {
  classStatus!.textContent = kit.name.toUpperCase();
  classStatus!.style.color = kit.color;
  body.material.color.set(kit.color);
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
    { key: "1", name: "Potion", cooldown: combat.cooldownRemaining("potion") },
    { key: "2", name: "Shield", cooldown: combat.cooldownRemaining("shield-item") },
    { key: "3", name: "Boss Spawner", cooldown: combat.cooldownRemaining("boss-spawner") },
  ];
  abilitiesHud!.replaceChildren(...entries.map((entry) => {
    const item = document.createElement("span");
    item.className = entry.cooldown > 0 ? "cooldown" : "";
    item.innerHTML = "<b>" + entry.key + "</b>" + entry.name + (entry.cooldown > 0 ? " · " + entry.cooldown.toFixed(1) : "");
    return item;
  }));
}

updateClassHud();

window.addEventListener("keydown", (event) => {
  const controls = ["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight", "KeyQ", "KeyE", "KeyR", "KeyF", "Digit1", "Digit2", "Digit3"];
  if (controls.includes(event.code)) event.preventDefault();
  keys.add(event.code);
  if (event.repeat) return;
  if (event.code === "ShiftLeft" || event.code === "ShiftRight") startDash(kit.dashDistanceMultiplier);
  const abilitiesByKey: Record<string, AbilityDefinition | undefined> = { KeyQ: kit.abilities[0], KeyE: kit.abilities[1], KeyR: kit.abilities[2], KeyF: kit.abilities[3] };
  const selectedAbility = abilitiesByKey[event.code];
  if (selectedAbility) useAbility(selectedAbility);
  if (event.code === "Digit1") usePotion();
  if (event.code === "Digit2") useShield();
  if (event.code === "Digit3") spawnBoss();
});

window.addEventListener("keyup", (event) => keys.delete(event.code));
renderer.domElement.addEventListener("contextmenu", (event) => event.preventDefault());
renderer.domElement.addEventListener("pointermove", (event) => {
  if (isCameraRotating) {
    cameraYaw -= event.movementX * .008;
    cameraPitch = THREE.MathUtils.clamp(cameraPitch + event.movementY * .006, THREE.MathUtils.degToRad(35), THREE.MathUtils.degToRad(65));
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
  if (event.button === 0 && combat.canUse("basic-attack")) {
    combat.startCooldown("basic-attack", .38);
    fireProjectile(kit.basicAttackDamage, "#fff0d6", 19, .13);
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
    projectile.mesh.position.x += projectile.velocity.x * delta;
    projectile.mesh.position.y += projectile.velocity.y * delta;
    const hit = enemies.find((enemy) => projectile.mesh.position.distanceTo(enemy.mesh.position) < projectile.radius + enemy.radius);
    if (hit) damageEnemy(hit, projectile.damage, projectile.mesh.material.color.getStyle());
    if (hit || projectile.life <= 0) {
      scene.remove(projectile.mesh);
      projectiles.splice(projectiles.indexOf(projectile), 1);
    }
  }
}

function updateEnemies(delta: number) {
  for (const enemy of enemies) {
    const direction = new THREE.Vector2(player.position.x - enemy.mesh.position.x, player.position.y - enemy.mesh.position.y);
    const distance = direction.length();
    if (distance > enemy.radius + .68) {
      direction.normalize().multiplyScalar(enemy.speed * delta);
      enemy.mesh.position.x += direction.x;
      enemy.mesh.position.y += direction.y;
    }
    enemy.attackTimer -= delta;
    if (distance < enemy.radius + .82 && enemy.attackTimer <= 0) {
      combat.takeDamage(enemy.boss ? 14 : 7);
      enemy.attackTimer = enemy.boss ? .8 : 1.1;
      addEffect(new THREE.Vector2(player.position.x, player.position.y), .85, "#dc5c7a", .22);
    }
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
  dashStatus!.textContent = dashCooldownRemaining <= 0 ? "DASH READY" : "DASH " + Math.round((1 - dashCooldownRemaining / 3) * 100) + "%";
  dashStatus!.style.color = dashCooldownRemaining <= 0 ? "#ffb257" : "#9cabb7";
  positionStatus!.textContent = "X " + Math.round(player.position.x) + " · Y " + Math.round(player.position.y);
  updateAbilityHud();
}

function render(now: number) {
  const delta = Math.min((now - lastTime) / 1000, .05);
  lastTime = now;
  combat.update(delta);
  dashCooldownRemaining = Math.max(0, dashCooldownRemaining - delta);
  hasteRemaining = Math.max(0, hasteRemaining - delta);
  if (hasteRemaining <= 0) body.material.opacity = 1;

  const direction = getMoveDirection();
  const speed = kit.moveSpeed * (hasteRemaining > 0 ? 1.3 : 1);
  if (dashRemaining > 0) {
    player.position.x += dashDirection.x * 24 * delta;
    player.position.y += dashDirection.y * 24 * delta;
    dashRemaining -= delta;
    body.material.color.set("#fff0d6");
  } else {
    player.position.x += direction.x * speed * delta;
    player.position.y += direction.y * speed * delta;
    body.material.color.set(kit.color);
  }

  updateAim();
  updateProjectiles(delta);
  updateEnemies(delta);
  updateEffects(delta);

  const cameraTarget = new THREE.Vector3(player.position.x, player.position.y, .35);
  const horizontalDistance = CAMERA_DISTANCE * Math.cos(cameraPitch);
  const height = CAMERA_DISTANCE * Math.sin(cameraPitch);
  camera.position.set(
    player.position.x + Math.sin(cameraYaw) * horizontalDistance,
    player.position.y - Math.cos(cameraYaw) * horizontalDistance,
    height,
  );
  camera.lookAt(cameraTarget);
  updateHud();

  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

requestAnimationFrame(render);
