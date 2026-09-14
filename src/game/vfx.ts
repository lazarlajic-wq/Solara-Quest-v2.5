import * as THREE from "three";

type Particle = {
  mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
};

type Ring = {
  mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  life: number;
  maxLife: number;
  grow: number;
};

export class VfxSystem {
  private particles: Particle[] = [];
  private rings: Ring[] = [];

  constructor(private readonly scene: THREE.Scene) {}

  impact(position: THREE.Vector3, color: THREE.ColorRepresentation, count = 8) {
    for (let index = 0; index < count; index += 1) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(.12, .12, .12), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .95 }));
      mesh.position.copy(position).add(new THREE.Vector3(0, 0, .45));
      this.scene.add(mesh);
      const angle = Math.random() * Math.PI * 2;
      this.particles.push({ mesh, velocity: new THREE.Vector3(Math.cos(angle) * (1 + Math.random() * 2), Math.sin(angle) * (1 + Math.random() * 2), .8 + Math.random() * 1.5), life: .26 + Math.random() * .15, maxLife: .4 });
    }
  }

  trail(position: THREE.Vector3, color: THREE.ColorRepresentation) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(.1, .1, .1), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .7 }));
    mesh.position.copy(position).add(new THREE.Vector3(0, 0, .28));
    this.scene.add(mesh);
    this.particles.push({ mesh, velocity: new THREE.Vector3(0, 0, .04), life: .17, maxLife: .17 });
  }

  ring(position: THREE.Vector3, radius: number, color: THREE.ColorRepresentation, life = .42) {
    const mesh = new THREE.Mesh(new THREE.RingGeometry(Math.max(.08, radius * .86), radius, 24), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, side: THREE.DoubleSide }));
    mesh.position.copy(position).add(new THREE.Vector3(0, 0, .16));
    this.scene.add(mesh);
    this.rings.push({ mesh, life, maxLife: life, grow: .55 });
  }

  skillCast(position: THREE.Vector3, color: THREE.ColorRepresentation, power = 1) {
    this.ring(position, .72 * power, color, .28);
    this.ring(position, 1.25 * power, color, .44);
    this.impact(position, color, Math.round(10 * power));
  }

  dash(position: THREE.Vector3, color: THREE.ColorRepresentation) {
    this.ring(position, .85, color, .2);
    this.impact(position, color, 5);
  }

  bossSummon(position: THREE.Vector3) {
    this.ring(position, 1.25, "#ffb450", .65);
    this.ring(position, 2.2, "#ff6b58", .9);
    for (let index = 0; index < 18; index += 1) this.impact(position, index % 2 ? "#ffb450" : "#ff6b58", 1);
  }

  update(delta: number) {
    for (const particle of [...this.particles]) {
      particle.life -= delta;
      particle.mesh.position.addScaledVector(particle.velocity, delta);
      particle.velocity.z -= 5 * delta;
      particle.mesh.rotation.x += delta * 10;
      particle.mesh.rotation.z += delta * 8;
      particle.mesh.material.opacity = Math.max(0, particle.life / particle.maxLife);
      if (particle.life <= 0) {
        this.scene.remove(particle.mesh);
        this.particles.splice(this.particles.indexOf(particle), 1);
      }
    }
    for (const ring of [...this.rings]) {
      ring.life -= delta;
      const progress = 1 - ring.life / ring.maxLife;
      ring.mesh.scale.setScalar(1 + progress * ring.grow);
      ring.mesh.material.opacity = Math.max(0, ring.life / ring.maxLife);
      if (ring.life <= 0) {
        this.scene.remove(ring.mesh);
        this.rings.splice(this.rings.indexOf(ring), 1);
      }
    }
  }
}
