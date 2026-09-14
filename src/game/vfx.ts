import * as THREE from "three";

type Particle = {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
  gravity: number;
  drag: number;
  life: number;
  maxLife: number;
  startScale: number;
  endScale: number;
};

type Ring = {
  mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  life: number;
  maxLife: number;
  grow: number;
  spin: number;
};

type Flash = {
  light: THREE.PointLight;
  life: number;
  maxLife: number;
  peak: number;
};

const additiveMaterial = (color: THREE.ColorRepresentation, opacity = 1) =>
  new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    side: THREE.DoubleSide,
  });

export class VfxSystem {
  private readonly particles: Particle[] = [];
  private readonly rings: Ring[] = [];
  private readonly flashes: Flash[] = [];
  private readonly maxParticles = 620;

  constructor(private readonly scene: THREE.Scene) {}

  private particle(
    position: THREE.Vector3,
    color: THREE.ColorRepresentation,
    velocity: THREE.Vector3,
    size: number,
    life: number,
    options: { gravity?: number; drag?: number; stretch?: number; endScale?: number } = {},
  ) {
    if (this.particles.length >= this.maxParticles) {
      const oldest = this.particles.shift();
      if (oldest) {
        this.scene.remove(oldest.mesh);
        oldest.mesh.geometry.dispose();
        oldest.mesh.material.dispose();
      }
    }

    const stretch = options.stretch ?? 1;
    const geometry = new THREE.BoxGeometry(size * stretch, size, size);
    const mesh = new THREE.Mesh(geometry, additiveMaterial(color, .95));
    mesh.position.copy(position);
    mesh.rotation.z = Math.atan2(velocity.y, velocity.x);
    this.scene.add(mesh);
    this.particles.push({
      mesh,
      velocity,
      spin: new THREE.Vector3(
        (Math.random() - .5) * 12,
        (Math.random() - .5) * 12,
        (Math.random() - .5) * 14,
      ),
      gravity: options.gravity ?? 4.5,
      drag: options.drag ?? 1.4,
      life,
      maxLife: life,
      startScale: 1,
      endScale: options.endScale ?? .08,
    });
  }

  private flash(position: THREE.Vector3, color: THREE.ColorRepresentation, intensity: number, range: number, life = .16) {
    const light = new THREE.PointLight(color, intensity, range, 2);
    light.position.copy(position).add(new THREE.Vector3(0, 0, .8));
    this.scene.add(light);
    this.flashes.push({ light, life, maxLife: life, peak: intensity });
  }

  impact(position: THREE.Vector3, color: THREE.ColorRepresentation, count = 10, power = 1) {
    const origin = position.clone().add(new THREE.Vector3(0, 0, .42));
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (2.1 + Math.random() * 4.4) * power;
      this.particle(
        origin,
        color,
        new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed, 1.4 + Math.random() * 3.2),
        (.07 + Math.random() * .12) * power,
        .25 + Math.random() * .28,
        { gravity: 7, drag: 1.8, stretch: 2.4, endScale: .02 },
      );
    }
    this.ring(position, .34 * power, color, .22, 1.8);
    this.flash(origin, color, 12 * power, 4.5 * power);
  }

  trail(position: THREE.Vector3, color: THREE.ColorRepresentation, power = 1) {
    const jitter = new THREE.Vector3((Math.random() - .5) * .16, (Math.random() - .5) * .16, .25);
    this.particle(
      position.clone().add(jitter),
      color,
      new THREE.Vector3((Math.random() - .5) * .28, (Math.random() - .5) * .28, .15),
      .07 * power,
      .16 + Math.random() * .08,
      { gravity: 0, drag: 4, endScale: .01 },
    );
  }

  projectileTrail(position: THREE.Vector3, color: THREE.ColorRepresentation, power = 1) {
    this.trail(position, color, power);
    if (Math.random() > .48) {
      const angle = Math.random() * Math.PI * 2;
      this.particle(
        position.clone().add(new THREE.Vector3(0, 0, .18)),
        color,
        new THREE.Vector3(Math.cos(angle) * .65, Math.sin(angle) * .65, .3),
        .045 * power,
        .2,
        { gravity: .8, drag: 3, endScale: .01 },
      );
    }
  }

  ring(
    position: THREE.Vector3,
    radius: number,
    color: THREE.ColorRepresentation,
    life = .42,
    grow = .65,
    opacity = .92,
  ) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(Math.max(.025, radius * .82), radius, 32),
      additiveMaterial(color, opacity),
    );
    mesh.position.copy(position).add(new THREE.Vector3(0, 0, .12));
    mesh.rotation.z = Math.random() * Math.PI;
    this.scene.add(mesh);
    this.rings.push({ mesh, life, maxLife: life, grow, spin: (Math.random() - .5) * 3 });
  }

  shockwave(position: THREE.Vector3, radius: number, color: THREE.ColorRepresentation, power = 1) {
    this.ring(position, radius * .42, color, .3, 2.1 * power, .95);
    this.ring(position, radius * .7, "#fff3d6", .2, .8 * power, .7);
    this.flash(position, color, 18 * power, radius * 2.4);
  }

  skillCast(position: THREE.Vector3, color: THREE.ColorRepresentation, power = 1) {
    this.ring(position, .58 * power, color, .22, .75);
    this.ring(position, 1.05 * power, color, .38, .48, .72);
    for (let index = 0; index < Math.round(8 * power); index += 1) {
      const angle = (index / Math.max(1, Math.round(8 * power))) * Math.PI * 2;
      this.particle(
        position.clone().add(new THREE.Vector3(Math.cos(angle) * .8 * power, Math.sin(angle) * .8 * power, .18)),
        color,
        new THREE.Vector3(-Math.cos(angle) * 1.4, -Math.sin(angle) * 1.4, 1.4 + Math.random()),
        .075 * power,
        .34,
        { gravity: 2.2, drag: 1.2, stretch: 1.8, endScale: .02 },
      );
    }
    this.flash(position, color, 9 * power, 4 * power);
  }

  abilityImpact(position: THREE.Vector3, color: THREE.ColorRepresentation, abilityId: string, radius: number) {
    const power = THREE.MathUtils.clamp(radius / 2.2, .75, 2.2);
    if (abilityId === "iron-slam" || abilityId === "gravity-verdict") {
      this.shockwave(position, radius, color, 1.35);
      for (let index = 0; index < 22; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        this.particle(
          position.clone().add(new THREE.Vector3(Math.cos(angle) * Math.random() * radius, Math.sin(angle) * Math.random() * radius, .1)),
          index % 3 === 0 ? "#ffd8a0" : color,
          new THREE.Vector3(Math.cos(angle) * (2 + Math.random() * 3), Math.sin(angle) * (2 + Math.random() * 3), 2 + Math.random() * 4),
          .1 + Math.random() * .13,
          .45 + Math.random() * .25,
          { gravity: 9, drag: 1.6, stretch: 1.3, endScale: .12 },
        );
      }
      return;
    }

    if (abilityId === "arrow-rain") {
      this.ring(position, radius, color, .7, .08, .55);
      for (let index = 0; index < 18; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.sqrt(Math.random()) * radius;
        const point = position.clone().add(new THREE.Vector3(Math.cos(angle) * distance, Math.sin(angle) * distance, 3 + Math.random() * 3));
        this.particle(point, color, new THREE.Vector3(0, 0, -8 - Math.random() * 4), .075, .42, {
          gravity: 2,
          drag: 0,
          stretch: 5,
          endScale: .45,
        });
      }
      this.flash(position, color, 12, radius * 2);
      return;
    }

    if (abilityId === "frostwell" || abilityId === "celestial-waltz") {
      this.ring(position, radius * .62, color, .75, .75, .7);
      this.ring(position, radius, "#d9f5ff", .95, .25, .5);
      for (let index = 0; index < 24; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * radius;
        this.particle(
          position.clone().add(new THREE.Vector3(Math.cos(angle) * distance, Math.sin(angle) * distance, .1)),
          index % 3 === 0 ? "#ffffff" : color,
          new THREE.Vector3(-Math.sin(angle) * 1.8, Math.cos(angle) * 1.8, .6 + Math.random() * 1.8),
          .055 + Math.random() * .08,
          .55 + Math.random() * .35,
          { gravity: .8, drag: .9, endScale: .04 },
        );
      }
      this.flash(position, color, 16 * power, radius * 2.1);
      return;
    }

    if (abilityId === "phantom-barrage" || abilityId === "eclipse-hunt") {
      for (let index = 0; index < 6; index += 1) {
        const arc = new THREE.Mesh(
          new THREE.RingGeometry(radius * .35, radius * .52, 24, 1, index * 1.04, .65),
          additiveMaterial(index % 2 ? "#ffffff" : color, .9),
        );
        arc.position.copy(position).add(new THREE.Vector3(0, 0, .24 + index * .018));
        arc.rotation.z = index * 1.04;
        this.scene.add(arc);
        this.rings.push({ mesh: arc, life: .18 + index * .025, maxLife: .32, grow: .6, spin: index % 2 ? -8 : 8 });
      }
      this.impact(position, color, 18, 1.15);
      return;
    }

    this.shockwave(position, radius, color, power);
    this.impact(position, color, Math.round(12 * power), power);
  }

  dash(position: THREE.Vector3, color: THREE.ColorRepresentation, direction = new THREE.Vector2(1, 0)) {
    this.ring(position, .78, color, .18, 1.15);
    const angle = Math.atan2(direction.y, direction.x);
    for (let index = 0; index < 10; index += 1) {
      const spread = (Math.random() - .5) * .7;
      const backward = new THREE.Vector3(-Math.cos(angle + spread), -Math.sin(angle + spread), .15 + Math.random() * .7);
      this.particle(
        position.clone().add(new THREE.Vector3(0, 0, .3)),
        color,
        backward.multiplyScalar(4 + Math.random() * 5),
        .07 + Math.random() * .06,
        .24 + Math.random() * .14,
        { gravity: 1.2, drag: 2.2, stretch: 5, endScale: .02 },
      );
    }
    this.flash(position, color, 10, 4);
  }

  afterimage(position: THREE.Vector3, rotation: number, color: THREE.ColorRepresentation) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(.82, .72, 1.05), additiveMaterial(color, .28));
    mesh.position.copy(position).add(new THREE.Vector3(0, 0, .62));
    mesh.rotation.z = rotation;
    this.scene.add(mesh);
    this.particles.push({
      mesh,
      velocity: new THREE.Vector3(0, 0, .12),
      spin: new THREE.Vector3(),
      gravity: 0,
      drag: 5,
      life: .2,
      maxLife: .2,
      startScale: 1,
      endScale: 1.18,
    });
  }

  bossSummon(position: THREE.Vector3) {
    this.ring(position, 1.4, "#ffb450", .7, 1.1);
    this.ring(position, 2.35, "#ff5b43", 1, .65);
    this.ring(position, 3.2, "#8e2bff", 1.2, .35, .55);
    for (let index = 0; index < 42; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = .4 + Math.random() * 2.8;
      const origin = position.clone().add(new THREE.Vector3(Math.cos(angle) * distance, Math.sin(angle) * distance, .1));
      this.particle(
        origin,
        index % 3 === 0 ? "#ffca72" : index % 2 ? "#ff5b43" : "#9e4cff",
        new THREE.Vector3(-Math.cos(angle) * (1 + Math.random() * 2), -Math.sin(angle) * (1 + Math.random() * 2), 2 + Math.random() * 5),
        .08 + Math.random() * .14,
        .6 + Math.random() * .55,
        { gravity: 5.5, drag: 1.2, stretch: 2.5, endScale: .03 },
      );
    }
    this.flash(position, "#ff7046", 34, 10, .42);
  }

  update(delta: number) {
    for (const particle of [...this.particles]) {
      particle.life -= delta;
      particle.velocity.multiplyScalar(Math.max(0, 1 - particle.drag * delta));
      particle.velocity.z -= particle.gravity * delta;
      particle.mesh.position.addScaledVector(particle.velocity, delta);
      particle.mesh.rotation.x += particle.spin.x * delta;
      particle.mesh.rotation.y += particle.spin.y * delta;
      particle.mesh.rotation.z += particle.spin.z * delta;
      const progress = THREE.MathUtils.clamp(1 - particle.life / particle.maxLife, 0, 1);
      const scale = THREE.MathUtils.lerp(particle.startScale, particle.endScale, progress);
      particle.mesh.scale.setScalar(scale);
      particle.mesh.material.opacity = Math.max(0, particle.life / particle.maxLife) * .95;
      if (particle.life <= 0) {
        this.scene.remove(particle.mesh);
        particle.mesh.geometry.dispose();
        particle.mesh.material.dispose();
        this.particles.splice(this.particles.indexOf(particle), 1);
      }
    }

    for (const ring of [...this.rings]) {
      ring.life -= delta;
      const progress = THREE.MathUtils.clamp(1 - ring.life / ring.maxLife, 0, 1);
      ring.mesh.scale.setScalar(1 + progress * ring.grow);
      ring.mesh.rotation.z += ring.spin * delta;
      ring.mesh.material.opacity = Math.max(0, ring.life / ring.maxLife) * .9;
      if (ring.life <= 0) {
        this.scene.remove(ring.mesh);
        ring.mesh.geometry.dispose();
        ring.mesh.material.dispose();
        this.rings.splice(this.rings.indexOf(ring), 1);
      }
    }

    for (const flash of [...this.flashes]) {
      flash.life -= delta;
      const remaining = Math.max(0, flash.life / flash.maxLife);
      flash.light.intensity = flash.peak * remaining * remaining;
      if (flash.life <= 0) {
        this.scene.remove(flash.light);
        flash.light.dispose();
        this.flashes.splice(this.flashes.indexOf(flash), 1);
      }
    }
  }
}
