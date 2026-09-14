import * as THREE from "three";

type Particle = {
  mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  gravity: number;
  drag: number;
  baseScale: THREE.Vector3;
  endScale: number;
  spin: number;
};

type Ring = {
  mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  radius: number;
  life: number;
  maxLife: number;
  grow: number;
  spin: number;
};

export class VfxSystem {
  private readonly particles: Particle[] = [];
  private readonly rings: Ring[] = [];
  private readonly particleGeometry = new THREE.BoxGeometry(1, 1, 1);
  private readonly ringGeometry = new THREE.RingGeometry(.82, 1, 28);
  private readonly materials = new Map<string, THREE.MeshBasicMaterial>();
  private readonly maxParticles = 160;
  private readonly maxRings = 42;

  constructor(private readonly scene: THREE.Scene) {}

  private material(color: THREE.ColorRepresentation, opacity = 1) {
    const hex = new THREE.Color(color).getHexString();
    const key = hex + ":" + opacity;
    let material = this.materials.get(key);
    if (!material) {
      material = new THREE.MeshBasicMaterial({
        color,
        transparent: opacity < 1,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        side: THREE.DoubleSide,
      });
      this.materials.set(key, material);
    }
    return material;
  }

  private particle(
    position: THREE.Vector3,
    color: THREE.ColorRepresentation,
    velocity: THREE.Vector3,
    size: number,
    life: number,
    options: { gravity?: number; drag?: number; stretch?: number; endScale?: number; opacity?: number } = {},
  ) {
    if (this.particles.length >= this.maxParticles) return;
    const stretch = options.stretch ?? 1;
    const mesh = new THREE.Mesh(this.particleGeometry, this.material(color, options.opacity ?? .88));
    mesh.position.copy(position);
    mesh.rotation.z = Math.atan2(velocity.y, velocity.x);
    const baseScale = new THREE.Vector3(size * stretch, size, size);
    mesh.scale.copy(baseScale);
    this.scene.add(mesh);
    this.particles.push({
      mesh,
      velocity,
      life,
      maxLife: life,
      gravity: options.gravity ?? 3.8,
      drag: options.drag ?? 1.5,
      baseScale,
      endScale: options.endScale ?? .08,
      spin: (Math.random() - .5) * 8,
    });
  }

  impact(position: THREE.Vector3, color: THREE.ColorRepresentation, count = 7, power = 1) {
    const total = Math.min(count, power > 1.3 ? 10 : 6);
    for (let index = 0; index < total; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (2 + Math.random() * 3) * power;
      this.particle(
        position.clone().add(new THREE.Vector3(0, 0, .42)),
        color,
        new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed, 1 + Math.random() * 2.2),
        .07 + Math.random() * .08,
        .22 + Math.random() * .14,
        { gravity: 6, drag: 2, stretch: 2.2, endScale: .04 },
      );
    }
    this.ring(position, .3 * power, color, .18, 1.5, .78);
  }

  trail(position: THREE.Vector3, color: THREE.ColorRepresentation, power = 1) {
    if (this.particles.length > 112 || Math.random() > .42) return;
    this.particle(
      position.clone().add(new THREE.Vector3((Math.random() - .5) * .12, (Math.random() - .5) * .12, .26)),
      color,
      new THREE.Vector3(0, 0, .12),
      .055 * power,
      .14,
      { gravity: 0, drag: 4.5, endScale: .02, opacity: .7 },
    );
  }

  projectileTrail(position: THREE.Vector3, color: THREE.ColorRepresentation, power = 1) {
    this.trail(position, color, power);
  }

  ring(
    position: THREE.Vector3,
    radius: number,
    color: THREE.ColorRepresentation,
    life = .38,
    grow = .6,
    opacity = .86,
  ) {
    if (this.rings.length >= this.maxRings) return;
    const mesh = new THREE.Mesh(this.ringGeometry, this.material(color, opacity));
    mesh.position.copy(position).add(new THREE.Vector3(0, 0, .13));
    mesh.rotation.z = Math.random() * Math.PI;
    mesh.scale.setScalar(radius);
    this.scene.add(mesh);
    this.rings.push({ mesh, radius, life, maxLife: life, grow, spin: (Math.random() - .5) * 2.2 });
  }

  shockwave(position: THREE.Vector3, radius: number, color: THREE.ColorRepresentation, power = 1) {
    this.ring(position, radius * .46, color, .28, 1.55 * power);
    this.ring(position, radius * .72, "#fff0cf", .18, .65 * power, .5);
  }

  skillCast(position: THREE.Vector3, color: THREE.ColorRepresentation, power = 1) {
    this.ring(position, .55 * power, color, .2, .72);
    for (let index = 0; index < Math.min(5, Math.round(5 * power)); index += 1) {
      const angle = (index / 5) * Math.PI * 2;
      this.particle(
        position.clone().add(new THREE.Vector3(Math.cos(angle) * .48 * power, Math.sin(angle) * .48 * power, .22)),
        color,
        new THREE.Vector3(-Math.cos(angle), -Math.sin(angle), 1.1),
        .065,
        .24,
        { gravity: 2.2, drag: 1.7, stretch: 1.6, endScale: .04 },
      );
    }
  }

  abilityImpact(position: THREE.Vector3, color: THREE.ColorRepresentation, abilityId: string, radius: number) {
    if (abilityId === "iron-slam" || abilityId === "gravity-verdict") {
      this.shockwave(position, radius, color, 1.15);
      this.impact(position, color, 12, 1.15);
      return;
    }
    if (abilityId === "arrow-rain") {
      this.ring(position, radius, color, .62, .1, .5);
      for (let index = 0; index < 9; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.sqrt(Math.random()) * radius;
        this.particle(
          position.clone().add(new THREE.Vector3(Math.cos(angle) * distance, Math.sin(angle) * distance, 3.4)),
          color,
          new THREE.Vector3(0, 0, -8),
          .065,
          .32,
          { gravity: 0, drag: 0, stretch: 4.5, endScale: .35 },
        );
      }
      return;
    }
    if (abilityId === "frostwell" || abilityId === "celestial-waltz") {
      this.ring(position, radius * .64, color, .7, .52, .65);
      this.ring(position, radius, "#d9f5ff", .82, .2, .45);
      for (let index = 0; index < 10; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        this.particle(
          position.clone().add(new THREE.Vector3(Math.cos(angle) * radius * .55, Math.sin(angle) * radius * .55, .2)),
          color,
          new THREE.Vector3(-Math.sin(angle), Math.cos(angle), 1.2),
          .055,
          .42,
          { gravity: 1, drag: 1.2, endScale: .03 },
        );
      }
      return;
    }
    if (abilityId === "phantom-barrage" || abilityId === "eclipse-hunt") {
      this.ring(position, radius * .58, color, .24, .9);
      this.ring(position, radius * .4, "#ffffff", .16, 1.4, .7);
      this.impact(position, color, 9, 1.05);
      return;
    }
    this.shockwave(position, radius, color);
    this.impact(position, color, 7);
  }

  dash(position: THREE.Vector3, color: THREE.ColorRepresentation, direction = new THREE.Vector2(1, 0)) {
    this.ring(position, .72, color, .16, 1.05);
    const angle = Math.atan2(direction.y, direction.x);
    for (let index = 0; index < 5; index += 1) {
      const spread = (Math.random() - .5) * .55;
      this.particle(
        position.clone().add(new THREE.Vector3(0, 0, .32)),
        color,
        new THREE.Vector3(-Math.cos(angle + spread) * 4.4, -Math.sin(angle + spread) * 4.4, .45),
        .065,
        .2,
        { gravity: 1, drag: 2.5, stretch: 4.2, endScale: .04 },
      );
    }
  }

  afterimage(position: THREE.Vector3, rotation: number, color: THREE.ColorRepresentation) {
    if (this.particles.length >= this.maxParticles - 4) return;
    const mesh = new THREE.Mesh(this.particleGeometry, this.material(color, .22));
    mesh.position.copy(position).add(new THREE.Vector3(0, 0, .62));
    mesh.rotation.z = rotation;
    const baseScale = new THREE.Vector3(.82, .72, 1.05);
    mesh.scale.copy(baseScale);
    this.scene.add(mesh);
    this.particles.push({
      mesh,
      velocity: new THREE.Vector3(0, 0, .08),
      life: .16,
      maxLife: .16,
      gravity: 0,
      drag: 4,
      baseScale,
      endScale: 1.12,
      spin: 0,
    });
  }

  bossSummon(position: THREE.Vector3) {
    this.ring(position, 1.4, "#ffb450", .6, 1);
    this.ring(position, 2.3, "#ff5b43", .86, .55);
    for (let index = 0; index < 16; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      this.particle(
        position.clone().add(new THREE.Vector3(Math.cos(angle) * 1.5, Math.sin(angle) * 1.5, .12)),
        index % 2 ? "#ff5b43" : "#ffcf70",
        new THREE.Vector3(-Math.cos(angle) * 2.2, -Math.sin(angle) * 2.2, 3.3),
        .09,
        .48,
        { gravity: 5, drag: 1.5, stretch: 2.4, endScale: .04 },
      );
    }
  }

  update(delta: number) {
    for (const particle of [...this.particles]) {
      particle.life -= delta;
      particle.velocity.multiplyScalar(Math.max(0, 1 - particle.drag * delta));
      particle.velocity.z -= particle.gravity * delta;
      particle.mesh.position.addScaledVector(particle.velocity, delta);
      particle.mesh.rotation.z += particle.spin * delta;
      const progress = THREE.MathUtils.clamp(1 - particle.life / particle.maxLife, 0, 1);
      const scale = THREE.MathUtils.lerp(1, particle.endScale, progress);
      particle.mesh.scale.copy(particle.baseScale).multiplyScalar(scale);
      if (particle.life <= 0) {
        this.scene.remove(particle.mesh);
        this.particles.splice(this.particles.indexOf(particle), 1);
      }
    }

    for (const ring of [...this.rings]) {
      ring.life -= delta;
      const progress = THREE.MathUtils.clamp(1 - ring.life / ring.maxLife, 0, 1);
      ring.mesh.scale.setScalar(ring.radius * (1 + progress * ring.grow));
      ring.mesh.rotation.z += ring.spin * delta;
      if (ring.life <= 0) {
        this.scene.remove(ring.mesh);
        this.rings.splice(this.rings.indexOf(ring), 1);
      }
    }
  }
}
