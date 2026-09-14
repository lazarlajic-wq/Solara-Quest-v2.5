import * as THREE from "three";

const material = (color: THREE.ColorRepresentation, emissive?: THREE.ColorRepresentation) =>
  new THREE.MeshBasicMaterial({
    color,
    toneMapped: false,
    transparent: Boolean(emissive),
    opacity: 1,
    side: THREE.DoubleSide,
  });

const cube = (width: number, depth: number, height: number, color: THREE.ColorRepresentation) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, depth, height), material(color));
  mesh.position.z = height / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

export const LOBBY_POINTS = {
  hut: new THREE.Vector2(-5.2, 2.5),
  floorPortal: new THREE.Vector2(5.4, 3.2),
  royalDragon: new THREE.Vector2(1.5, -5.2),
} as const;

export function createLobbyWorld(scene: THREE.Scene) {
  const world = new THREE.Group();
  world.name = "solara-village-lobby";
  scene.add(world);

  const ambient = new THREE.HemisphereLight("#d3ddff", "#1c283a", 2.35);
  const sun = new THREE.DirectionalLight("#ffe5b5", 3.5);
  sun.position.set(-12, -10, 22);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -22;
  sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 22;
  sun.shadow.camera.bottom = -22;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 45;
  sun.shadow.normalBias = .025;
  world.add(ambient, sun);

  // Unlit materials guarantee that the village remains visible on every WebGL driver.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(48, 48), material("#4c7b5c"));
  ground.receiveShadow = true;
  world.add(ground);

  const grid = new THREE.GridHelper(48, 24, "#6a9b70", "#3d674d");
  grid.material.transparent = true;
  grid.material.opacity = .34;
  grid.position.z = .015;
  world.add(grid);

  const path = new THREE.Mesh(new THREE.BoxGeometry(30, 2.2, .08), material("#bc9860"));
  path.position.set(0, 0, .04);
  path.receiveShadow = true;
  world.add(path);

  const hut = new THREE.Group();
  const hutWall = cube(4.7, 3.7, 2.6, "#cf9563");
  const hutRoof = new THREE.Mesh(new THREE.ConeGeometry(3.65, 2.15, 4), material("#704851"));
  hutRoof.rotation.z = Math.PI / 4;
  hutRoof.position.z = 3.55;
  const hutDoor = cube(.92, .18, 1.62, "#483026");
  hutDoor.position.set(0, -1.93, .81);
  const hutWindow = cube(.9, .1, .66, "#ffd777");
  hutWindow.position.set(1.45, -1.91, 1.6);
  hut.add(hutWall, hutRoof, hutDoor, hutWindow);
  hut.position.set(LOBBY_POINTS.hut.x, LOBBY_POINTS.hut.y, 0);
  hut.traverse((child) => { if (child instanceof THREE.Mesh) { child.castShadow = true; child.receiveShadow = true; } });
  world.add(hut);

  const portal = new THREE.Group();
  const portalBase = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, .35, 8), material("#49313b"));
  portalBase.position.z = .18;
  const portalRing = new THREE.Mesh(new THREE.TorusGeometry(1.22, .18, 6, 12), material("#c65045", "#d84236"));
  portalRing.rotation.x = Math.PI / 2;
  portalRing.position.z = 1.35;
  const portalCore = new THREE.Mesh(new THREE.CircleGeometry(1.05, 16), material("#f05d44", "#ff7046"));
  portalCore.position.z = 1.36;
  portal.add(portalBase, portalRing, portalCore);
  portal.position.set(LOBBY_POINTS.floorPortal.x, LOBBY_POINTS.floorPortal.y, 0);
  world.add(portal);

  const dragon = new THREE.Group();
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, .7, 8), material("#495163"));
  pedestal.position.z = .35;
  const dragonBody = new THREE.Mesh(new THREE.DodecahedronGeometry(1.05, 0), material("#5672a8"));
  dragonBody.scale.set(1.2, .82, 1.45);
  dragonBody.position.z = 1.8;
  const dragonHead = new THREE.Mesh(new THREE.ConeGeometry(.62, 1.35, 5), material("#6b8ed0"));
  dragonHead.rotation.x = Math.PI / 2;
  dragonHead.position.set(0, -.9, 2.2);
  const wingLeft = cube(1.6, .18, 1, "#5b78b0");
  wingLeft.position.set(-1.05, 0, 2.15);
  wingLeft.rotation.y = -.35;
  const wingRight = wingLeft.clone();
  wingRight.position.x = 1.05;
  wingRight.rotation.y = .35;
  dragon.add(pedestal, dragonBody, dragonHead, wingLeft, wingRight);
  dragon.position.set(LOBBY_POINTS.royalDragon.x, LOBBY_POINTS.royalDragon.y, 0);
  dragon.traverse((child) => { if (child instanceof THREE.Mesh) { child.castShadow = true; child.receiveShadow = true; } });
  world.add(dragon);

  for (let index = 0; index < 18; index += 1) {
    const angle = (index / 18) * Math.PI * 2;
    const distance = 11 + (index % 3) * 2;
    const tree = new THREE.Group();
    const trunk = cube(.35, .35, 1.25, "#604330");
    const leaves = cube(1.45, 1.35, 1, index % 2 ? "#377152" : "#4d895e");
    leaves.position.z = 1.5;
    tree.add(trunk, leaves);
    tree.position.set(Math.cos(angle) * distance, Math.sin(angle) * distance, 0);
    tree.traverse((child) => { if (child instanceof THREE.Mesh) { child.castShadow = true; child.receiveShadow = true; } });
    world.add(tree);
  }

  return world;
}
