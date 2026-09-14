import * as THREE from "three";

const material = (color: THREE.ColorRepresentation) =>
  new THREE.MeshStandardMaterial({ color, roughness: .93, metalness: 0 });

const shadow = (object: THREE.Object3D, receive = false) => {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = !receive;
      child.receiveShadow = receive;
    }
  });
  return object;
};

const cube = (width: number, depth: number, height: number, color: THREE.ColorRepresentation) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, depth, height), material(color));
  mesh.position.z = height / 2;
  return mesh;
};

const PALETTES = [
  { ground: "#547b54", water: "#3b87a8", foliage: "#2f6543", crown: "#559050", roof: "#7e4855" },
  { ground: "#786f49", water: "#56869b", foliage: "#4e6e3c", crown: "#88924f", roof: "#8e5c42" },
  { ground: "#536b7b", water: "#4b8ab1", foliage: "#315e68", crown: "#5e98a0", roof: "#6f526f" },
  { ground: "#70504a", water: "#516b87", foliage: "#5b493d", crown: "#9b6542", roof: "#75404b" },
] as const;

export function createPixelWorld(scene: THREE.Scene, seed = 1) {
  let randomState = seed * 16807;
  const random = () => {
    randomState = (randomState * 48271) % 2147483647;
    return (randomState - 1) / 2147483646;
  };
  const palette = PALETTES[(seed - 1) % PALETTES.length];
  const world = new THREE.Group();
  world.name = "procedural-floor-map";
  scene.add(world);
  const ambient = new THREE.HemisphereLight("#b8d7ff", "#26331f", 2.1);
  world.add(ambient);

  const sun = new THREE.DirectionalLight("#ffe4b2", 3.3);
  sun.position.set(-12, -10, 22);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -24;
  sun.shadow.camera.right = 24;
  sun.shadow.camera.top = 24;
  sun.shadow.camera.bottom = -24;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 45;
  sun.shadow.normalBias = .025;
  world.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(66, 66), material(palette.ground));
  ground.receiveShadow = true;
  world.add(ground);

  const water = new THREE.Mesh(new THREE.BoxGeometry(13, 8, .16), material(palette.water));
  water.position.set(-11, 7, .07);
  water.receiveShadow = true;
  world.add(water);

  for (let i = 0; i < 9; i += 1) {
    const ripple = new THREE.Mesh(new THREE.BoxGeometry(1.1, .13, .025), material("#88c4d5"));
    ripple.position.set(-15 + (i % 4) * 2.5, 4.8 + Math.floor(i / 4) * 2.1, .17);
    world.add(ripple);
  }

  const pathSegments = [
    [-14, -10, 28, 2],
    [-2, -3, 3, 15],
    [4, 4, 14, 2],
  ] as const;
  for (const [x, y, width, depth] of pathSegments) {
    const path = new THREE.Mesh(new THREE.BoxGeometry(width, depth, .08), material("#ba985f"));
    path.position.set(x, y, .04);
    path.receiveShadow = true;
    world.add(path);
  }

  const addTree = (x: number, y: number, scale = 1) => {
    const tree = new THREE.Group();
    const trunk = cube(.38 * scale, .38 * scale, 1.35 * scale, "#63432f");
    const foliage = cube(1.55 * scale, 1.45 * scale, .95 * scale, "#2f6543");
    foliage.position.z = 1.55 * scale;
    const crown = cube(1.05 * scale, .98 * scale, .45 * scale, "#559050");
    crown.position.set(-.11 * scale, -.1 * scale, 2.16 * scale);
    tree.add(trunk, foliage, crown);
    tree.position.set(x, y, 0);
    world.add(shadow(tree));
  };

  [
    [-17, -5, 1.2], [-13, 1, .85], [-6, 10, 1.1], [0, 11, .92],
    [10, 9, 1.2], [15, 3, .85], [13, -9, 1.1], [5, -12, .95],
    [-7, -12, 1.12], [-16, -12, .9], [-3, 4, .75], [8, -1, .72],
  ].forEach(([x, y, scale]) => addTree(x + (random() - .5) * 7, y + (random() - .5) * 7, scale * (.8 + random() * .45)));

  const house = new THREE.Group();
  const wall = cube(5.2, 4.1, 2.6, "#d19a67");
  const door = cube(.85, .18, 1.55, "#493326");
  door.position.set(0, -2.14, .78);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.15, 2.1, 4), material(palette.roof));
  roof.rotation.z = Math.PI / 4;
  roof.position.z = 3.55;
  house.add(wall, door, roof);
  house.position.set(4 + random() * 9, 2 + random() * 9, 0);
house.rotation.z = Math.floor(random() * 4) * Math.PI / 2;
  world.add(shadow(house));

  const addRock = (x: number, y: number, scale = 1) => {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(.62 * scale, 0), material("#5d6970"));
    rock.scale.z = .72;
    rock.position.set(x, y, .46 * scale);
    world.add(shadow(rock));
  };
  [[-10, -7, 1.1], [-4, -8, .7], [2, -9, .9], [12, -5, 1.2], [14, 10, .8], [-1, 12, .8]].forEach(([x, y, scale]) => addRock(x, y, scale));

  const torch = new THREE.Group();
  const post = cube(.15, .15, 1.25, "#4d382b");
  const fire = new THREE.Mesh(new THREE.OctahedronGeometry(.28, 0), material("#ffad4a"));
  fire.position.z = 1.4;
  torch.add(post, fire);
  torch.position.set(3.2, 3.1, 0);
  world.add(shadow(torch));
  const torchLight = new THREE.PointLight("#ff9e4a", 18, 8, 2);
  torchLight.position.set(3.2, 3.1, 1.7);
  world.add(torchLight);

  world.rotation.z = Math.floor(random() * 4) * Math.PI / 2;
  return world;
}
