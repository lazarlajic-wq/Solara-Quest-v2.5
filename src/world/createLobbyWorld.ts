import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const material = (color: THREE.ColorRepresentation, emissive?: THREE.ColorRepresentation) =>
  new THREE.MeshBasicMaterial({
    color,
    toneMapped: false,
    transparent: Boolean(emissive),
    opacity: 1,
    side: THREE.DoubleSide,
  });

const sign = (title: string, subtitle: string, color: string) => {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Solara Village sign canvas unavailable");
  context.fillStyle = "rgba(7, 13, 23, .88)";
  context.strokeStyle = color;
  context.lineWidth = 5;
  context.roundRect(5, 5, 502, 118, 18);
  context.fill();
  context.stroke();
  context.textAlign = "center";
  context.fillStyle = "#fff4df";
  context.font = "800 42px system-ui";
  context.fillText(title, 256, 52);
  context.fillStyle = color;
  context.font = "800 24px system-ui";
  context.fillText(subtitle, 256, 91);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(4.6, 1.15, 1);
  return sprite;
};

const interactionMarker = (title: string, subtitle: string, color: string) => {
  const marker = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.65, 1.8, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, side: THREE.DoubleSide }),
  );
  ring.position.z = .1;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(.035, .16, 2.8, 8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .32, side: THREE.DoubleSide }),
  );
  beam.position.z = 1.5;
  const markerLabel = sign(title, subtitle, color);
  markerLabel.position.z = 4;
  marker.add(ring, beam, markerLabel);
  return marker;
};

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
  const hutMarker = interactionMarker("YOUR HUT", "PRESS E · CHOOSE CLASS", "#ffcb7e");
  hutMarker.position.set(LOBBY_POINTS.hut.x, LOBBY_POINTS.hut.y, 0);
  world.add(hutMarker);

  const portal = new THREE.Group();
  portal.name = "floor-rush-portal";
  portal.position.set(LOBBY_POINTS.floorPortal.x, LOBBY_POINTS.floorPortal.y, 0);
  world.add(portal);

  // A lightweight animated energy layer keeps the gate alive while the GLB loads.
  const portalFallback = new THREE.Group();
  portalFallback.name = "portal-fallback";
  const portalBase = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, .35, 8), material("#49313b"));
  portalBase.position.z = .18;
  const portalRing = new THREE.Mesh(new THREE.TorusGeometry(1.22, .18, 6, 12), material("#c65045", "#d84236"));
  portalRing.rotation.x = Math.PI / 2;
  portalRing.position.z = 1.35;
  const fallbackCore = new THREE.Mesh(new THREE.CircleGeometry(1.05, 16), material("#f05d44", "#ff7046"));
  fallbackCore.rotation.x = Math.PI / 2;
  fallbackCore.position.z = 1.36;
  portalFallback.add(portalBase, portalRing, fallbackCore);
  portal.add(portalFallback);

  const energyRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.28, .055, 6, 40),
    new THREE.MeshBasicMaterial({
      color: "#ff8a3d",
      transparent: true,
      opacity: .88,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  );
  energyRing.name = "portal-energy";
  energyRing.rotation.x = Math.PI / 2;
  energyRing.position.set(0, -.08, 2.78);
  portal.add(energyRing);

  const portalCoreMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color("#ff2d18") },
      uColorB: { value: new THREE.Color("#ffb13b") },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv - .5;
        p.y *= 1.18;
        float radius = length(p);
        float angle = atan(p.y, p.x);
        float spiral = sin(angle * 6.0 - uTime * 4.8 + radius * 25.0) * .5 + .5;
        float ripples = sin(radius * 42.0 - uTime * 7.0) * .5 + .5;
        float edge = smoothstep(.5, .18, radius);
        float center = smoothstep(.42, .02, radius);
        vec3 color = mix(uColorA, uColorB, spiral * .7 + ripples * .3);
        color *= .38 + spiral * .82 + ripples * .28;
        float alpha = edge * (.5 + center * .45);
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });
  const portalCore = new THREE.Mesh(new THREE.PlaneGeometry(2.28, 2.72, 1, 1), portalCoreMaterial);
  portalCore.name = "portal-core";
  portalCore.rotation.x = Math.PI / 2;
  portalCore.position.set(0, .04, 2.78);
  portal.add(portalCore);

  const innerRing = energyRing.clone();
  innerRing.name = "portal-energy-inner";
  innerRing.scale.setScalar(.8);
  innerRing.material = energyRing.material.clone();
  (innerRing.material as THREE.MeshBasicMaterial).color.set("#ffcf70");
  (innerRing.material as THREE.MeshBasicMaterial).opacity = .55;
  portal.add(innerRing);

  const emberGeometry = new THREE.BoxGeometry(.075, .075, .075);
  const emberMaterial = new THREE.MeshBasicMaterial({
    color: "#ff6a32",
    transparent: true,
    opacity: .9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const embers = new THREE.Group();
  embers.name = "portal-embers";
  for (let index = 0; index < 22; index += 1) {
    const ember = new THREE.Mesh(emberGeometry, emberMaterial);
    ember.userData.phase = Math.random() * Math.PI * 2;
    ember.userData.radius = 1.1 + Math.random() * 1.25;
    ember.userData.speed = .45 + Math.random() * .85;
    ember.userData.height = Math.random() * 4.5;
    embers.add(ember);
  }
  portal.add(embers);

  const portalLight = new THREE.PointLight("#ff4f2e", 34, 15, 2);
  portalLight.name = "portal-light";
  portalLight.position.z = 2.8;
  portal.add(portalLight);

  const portalLoader = new GLTFLoader();
  portalLoader.load(
    "/assets/models/solara-portal.glb",
    (gltf) => {
      if (!world.parent) return;
      const model = gltf.scene;
      model.name = "solara-portal-model";
      // Tripo exports in Y-up; Solara's world uses Z-up.
      model.rotation.x = Math.PI / 2;
      model.scale.setScalar(3.8);
      model.position.z = .02;
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      portalFallback.visible = false;
      portal.add(model);
    },
    undefined,
    () => {
      // The fallback remains playable if the asset cannot be loaded.
      portalFallback.visible = true;
    },
  );
  const floorMarker = interactionMarker("FLOOR RUSH", "PRESS E · ENTER HELL GATE", "#ff735a");
  floorMarker.position.set(LOBBY_POINTS.floorPortal.x, LOBBY_POINTS.floorPortal.y, 0);
  floorMarker.children[2].position.z = 7.6;
  world.add(floorMarker);

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
  const royaleMarker = interactionMarker("SOLARA ROYALE", "PRESS E · DRAGON MONUMENT", "#85aeff");
  royaleMarker.position.set(LOBBY_POINTS.royalDragon.x, LOBBY_POINTS.royalDragon.y, 0);
  world.add(royaleMarker);

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
