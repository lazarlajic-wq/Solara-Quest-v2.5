import * as THREE from "three";
import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");
const dashStatus = document.querySelector<HTMLSpanElement>("#dash-status");
const positionStatus = document.querySelector<HTMLSpanElement>("#position-status");

if (!app || !dashStatus || !positionStatus) {
  throw new Error("Solara HUD could not be created.");
}

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color("#101725");

const aspect = window.innerWidth / window.innerHeight;
const viewHeight = 16;
const camera = new THREE.OrthographicCamera(
  (-viewHeight * aspect) / 2,
  (viewHeight * aspect) / 2,
  viewHeight / 2,
  -viewHeight / 2,
  0.1,
  100,
);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const arena = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshBasicMaterial({ color: "#1b2b35" }),
);
scene.add(arena);

const grid = new THREE.GridHelper(80, 80, "#3e5960", "#29434a");
grid.rotation.x = Math.PI / 2;
grid.position.z = 0.01;
scene.add(grid);

const addObstacle = (x: number, y: number, width: number, height: number, color = "#374957") => {
  const obstacle = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, 0.35),
    new THREE.MeshBasicMaterial({ color }),
  );
  obstacle.position.set(x, y, 0.2);
  scene.add(obstacle);
};

addObstacle(-7, 4, 5, 1.2);
addObstacle(8, -4, 3, 4);
addObstacle(-3, -7, 6, 1);
addObstacle(8, 5, 2.5, 2.5, "#54454f");

const player = new THREE.Group();
const shadow = new THREE.Mesh(
  new THREE.CircleGeometry(0.72, 8),
  new THREE.MeshBasicMaterial({ color: "#081019", transparent: true, opacity: 0.55 }),
);
shadow.scale.set(1.15, 0.62, 1);
player.add(shadow);

const body = new THREE.Mesh(
  new THREE.CircleGeometry(0.58, 8),
  new THREE.MeshBasicMaterial({ color: "#ff9f43" }),
);
body.position.z = 0.15;
player.add(body);

const facing = new THREE.Mesh(
  new THREE.ConeGeometry(0.26, 0.58, 4),
  new THREE.MeshBasicMaterial({ color: "#fff0d6" }),
);
facing.rotation.z = -Math.PI / 2;
facing.position.set(0.62, 0, 0.18);
player.add(facing);
scene.add(player);

const cursor = new THREE.Mesh(
  new THREE.RingGeometry(0.2, 0.29, 16),
  new THREE.MeshBasicMaterial({ color: "#ffd26f", transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
);
cursor.position.z = 0.1;
scene.add(cursor);

const keys = new Set<string>();
const mouse = new THREE.Vector2();
const aimWorld = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const ground = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const moveDirection = new THREE.Vector2();
const lastTime = performance.now();

const baseSpeed = 6.2;
const dashSpeed = 24;
const dashDuration = 0.13;
const dashCooldown = 3;
let dashRemaining = 0;
let dashCooldownRemaining = 0;
const dashDirection = new THREE.Vector2(1, 0);

function updateAim() {
  raycaster.setFromCamera(mouse, camera);
  raycaster.ray.intersectPlane(ground, aimWorld);
  cursor.position.set(aimWorld.x, aimWorld.y, 0.1);

  const angle = Math.atan2(aimWorld.y - player.position.y, aimWorld.x - player.position.x);
  player.rotation.z = angle;
}

function getMoveDirection() {
  moveDirection.set(0, 0);
  if (keys.has("KeyW")) moveDirection.y += 1;
  if (keys.has("KeyS")) moveDirection.y -= 1;
  if (keys.has("KeyA")) moveDirection.x -= 1;
  if (keys.has("KeyD")) moveDirection.x += 1;
  return moveDirection.normalize();
}

function startDash() {
  if (dashCooldownRemaining > 0 || dashRemaining > 0) return;
  const direction = getMoveDirection();

  if (direction.lengthSq() === 0) {
    dashDirection.set(Math.cos(player.rotation.z), Math.sin(player.rotation.z));
  } else {
    dashDirection.copy(direction);
  }

  dashRemaining = dashDuration;
  dashCooldownRemaining = dashCooldown;
  body.material.color.set("#fff0d6");
}

window.addEventListener("keydown", (event) => {
  if (["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight"].includes(event.code)) {
    event.preventDefault();
  }
  keys.add(event.code);
  if (event.code === "ShiftLeft" || event.code === "ShiftRight") startDash();
});

window.addEventListener("keyup", (event) => keys.delete(event.code));

window.addEventListener("pointermove", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener("resize", () => {
  const nextAspect = window.innerWidth / window.innerHeight;
  camera.left = (-viewHeight * nextAspect) / 2;
  camera.right = (viewHeight * nextAspect) / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function render(now: number) {
  const delta = Math.min((now - lastTime) / 1000, 0.05);
  const direction = getMoveDirection();

  if (dashRemaining > 0) {
    player.position.x += dashDirection.x * dashSpeed * delta;
    player.position.y += dashDirection.y * dashSpeed * delta;
    dashRemaining -= delta;
    body.material.color.set("#fff0d6");
  } else {
    player.position.x += direction.x * baseSpeed * delta;
    player.position.y += direction.y * baseSpeed * delta;
    body.material.color.set("#ff9f43");
  }

  dashCooldownRemaining = Math.max(0, dashCooldownRemaining - delta);
  const dashPercent = Math.round((1 - dashCooldownRemaining / dashCooldown) * 100);
  dashStatus.textContent = dashCooldownRemaining <= 0 ? "DASH READY" : `DASH ${dashPercent}%`;
  dashStatus.style.color = dashCooldownRemaining <= 0 ? "#ffb257" : "#9cabb7";

  camera.position.x = THREE.MathUtils.lerp(camera.position.x, player.position.x, 1 - Math.exp(-8 * delta));
  camera.position.y = THREE.MathUtils.lerp(camera.position.y, player.position.y, 1 - Math.exp(-8 * delta));
  positionStatus.textContent = `X ${Math.round(player.position.x)} · Y ${Math.round(player.position.y)}`;

  updateAim();
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

requestAnimationFrame(render);
