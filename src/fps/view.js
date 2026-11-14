import * as THREE from 'three';
import { BOXES, SITES, SIZE } from './map.js';
import { TEAM, PLAYER, WEAPONS } from './rules.js';

/**
 * Draws a match of Breachline: the map (our own shapes: concrete walls,
 * crates, painted sites), the players as plain figures in their team's
 * colour, the weapon in your hands, shots as streaks of light, the charge.
 * It only reads the match; it changes nothing in it.
 */
export class FpsView {
  constructor(host) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'bl__canvas';
    host.prepend(this.canvas);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#9db8cf');
    this.scene.fog = new THREE.Fog('#9db8cf', 60, 170);
    this.camera = new THREE.PerspectiveCamera(74, 1, 0.05, 400);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);
    this.fov = 74;
    this.scene.add(new THREE.HemisphereLight('#eaf2ff', '#8d8474', 1.5));
    // A second, soft light from the other side, so walls facing away from the sun are not black.
    const fill = new THREE.DirectionalLight('#cfe0ff', 0.7);
    fill.position.set(-30, 40, 60);
    this.scene.add(fill);
    const sun = new THREE.DirectionalLight('#fff1d6', 2.1);
    sun.position.set(30, 70, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 50, bottom: -50, near: 1, far: 200 });
    sun.shadow.bias = -0.0008;
    sun.target.position.set(40, 0, 30);
    this.scene.add(sun, sun.target);
    this._map();
    this._gun();
    this.bodies = new Map();
    this.tracers = [];
    this.sparks = [];
    this.recoil = 0;
    this.bob = 0;
    this.time = 0;
  }

  /* ----------------------------------------------------------------- map */

  _texture(draw, repeat = 1) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    draw(c.getContext('2d'));
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  _map() {
    const floor = this._texture((g) => {
      g.fillStyle = '#8f8a80';
      g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 900; i++) {
        g.fillStyle = `rgba(${i % 2 ? 255 : 0},${i % 2 ? 255 : 0},${i % 2 ? 255 : 0},0.035)`;
        g.fillRect((i * 97) % 256, (i * 53) % 256, 3, 3);
      }
      g.strokeStyle = 'rgba(0,0,0,0.16)';
      g.lineWidth = 3;
      g.strokeRect(0, 0, 256, 256);
    }, 20);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(SIZE[0], SIZE[1]).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: floor, roughness: 0.95 }));
    ground.position.set(SIZE[0] / 2, 0, SIZE[1] / 2);
    ground.receiveShadow = true;
    this.scene.add(ground);
    const wall = new THREE.MeshStandardMaterial({ map: this._texture((g) => {
      g.fillStyle = '#b9b2a4';
      g.fillRect(0, 0, 256, 256);
      g.strokeStyle = 'rgba(60,50,40,0.22)';
      g.lineWidth = 4;
      for (let y = 0; y <= 256; y += 64) g.strokeRect(-4, y, 264, 64);
      for (let i = 0; i < 300; i++) {
        g.fillStyle = 'rgba(0,0,0,0.05)';
        g.fillRect((i * 71) % 256, (i * 37) % 256, 6, 2);
      }
    }, 1), roughness: 0.9 });
    const crate = new THREE.MeshStandardMaterial({ map: this._texture((g) => {
      g.fillStyle = '#a9773f';
      g.fillRect(0, 0, 256, 256);
      g.strokeStyle = '#6b451f';
      g.lineWidth = 16;
      g.strokeRect(8, 8, 240, 240);
      g.beginPath();
      g.moveTo(8, 8);
      g.lineTo(248, 248);
      g.moveTo(248, 8);
      g.lineTo(8, 248);
      g.stroke();
    }), roughness: 0.8 });
    const steel = new THREE.MeshStandardMaterial({ color: '#4d6a82', roughness: 0.5, metalness: 0.5 });
    for (const [x, z, w, d, h] of BOXES) {
      const tall = h > 3;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), tall ? wall.clone() : h > 2 ? steel : crate);
      if (tall) {
        m.material.map = wall.map.clone();
        m.material.map.repeat.set(Math.max(1, Math.round(Math.max(w, d) / 4)), Math.max(1, Math.round(h / 2)));
        m.material.map.needsUpdate = true;
      }
      m.position.set(x + w / 2, h / 2, z + d / 2);
      m.castShadow = true;
      m.receiveShadow = true;
      this.scene.add(m);
    }
    // The sites: a painted ring and a letter on the ground.
    for (const [name, s] of Object.entries(SITES)) {
      const t = this._texture((g) => {
        g.clearRect(0, 0, 256, 256);
        g.strokeStyle = '#ffd24a';
        g.lineWidth = 12;
        g.setLineDash([28, 16]);
        g.beginPath();
        g.arc(128, 128, 116, 0, Math.PI * 2);
        g.stroke();
        g.fillStyle = '#ffd24a';
        g.font = '900 150px system-ui, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(name, 128, 136);
      });
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(s.r * 2, s.r * 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0.9 }));
      mark.position.set(s.x, 0.03, s.z);
      this.scene.add(mark);
    }
    // The charge: a case with a light that blinks faster as its time runs out.
    this.chargeMesh = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.34), new THREE.MeshStandardMaterial({ color: '#2a2d33', roughness: 0.5 }));
    box.position.y = 0.11;
    box.castShadow = true;
    this.chargeLight = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: '#ff3b30' }));
    this.chargeLight.position.set(0.12, 0.25, 0);
    this.chargeMesh.add(box, this.chargeLight);
    this.chargeMesh.visible = false;
    this.scene.add(this.chargeMesh);
  }

  /* -------------------------------------------------------------- people */

  _body(p, side) {
    const color = new THREE.Color(TEAM[side].color);
    const cloth = new THREE.MeshStandardMaterial({ color, roughness: 0.75 });
    const dark = new THREE.MeshStandardMaterial({ color: color.clone().multiplyScalar(0.45), roughness: 0.8 });
    const skin = new THREE.MeshStandardMaterial({ color: '#d9a988', roughness: 0.8 });
    const g = new THREE.Group();
    const part = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      g.add(m);
      return m;
    };
    part(new THREE.CapsuleGeometry(0.27, 0.5, 4, 10), cloth, 0, 1.05, 0);
    const legL = part(new THREE.CapsuleGeometry(0.12, 0.5, 4, 8), dark, -0.14, 0.4, 0);
    const legR = part(new THREE.CapsuleGeometry(0.12, 0.5, 4, 8), dark, 0.14, 0.4, 0);
    part(new THREE.SphereGeometry(0.2, 14, 10), skin, 0, 1.6, 0);
    part(new THREE.SphereGeometry(0.215, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), dark, 0, 1.63, 0); // a helmet's worth of cap
    const gun = part(new THREE.BoxGeometry(0.08, 0.1, 0.7), new THREE.MeshStandardMaterial({ color: '#22252b', roughness: 0.4, metalness: 0.5 }), 0.2, 1.25, -0.4);
    this.scene.add(g);
    return { group: g, legL, legR, gun, side, fall: 0 };
  }

  /* ---------------------------------------------------- the gun in hand */

  _gun() {
    const g = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: '#4a515e', roughness: 0.5, metalness: 0.15 });
    const grip = new THREE.MeshStandardMaterial({ color: '#7a5433', roughness: 0.8 });
    this.gunParts = {
      body: new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.5), metal),
      barrel: new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.4, 10).rotateX(Math.PI / 2), metal),
      stock: new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.13, 0.26), grip),
      handle: new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.17, 0.08), grip),
      mag: new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.2, 0.09), metal),
      scope: new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.26, 12).rotateX(Math.PI / 2), metal)
    };
    this.gunParts.barrel.position.set(0, 0.02, -0.42);
    this.gunParts.stock.position.set(0, -0.02, 0.36);
    this.gunParts.handle.position.set(0, -0.13, 0.12);
    this.gunParts.handle.rotation.x = 0.25;
    this.gunParts.mag.position.set(0, -0.15, -0.06);
    this.gunParts.scope.position.set(0, 0.1, -0.02);
    for (const m of Object.values(this.gunParts)) g.add(m);
    this.flash = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthTest: false }));
    this.flash.position.set(0, 0.02, -0.68);
    g.add(this.flash);
    g.scale.setScalar(0.62);
    g.position.set(0.17, -0.17, -0.4);
    this.gun = g;
    this.camera.add(g);
  }

  /** Shape the gun in hand to the weapon held. */
  holding(id) {
    if (this.held === id) return;
    this.held = id;
    const w = WEAPONS[id];
    const long = w.slot === 1;
    const p = this.gunParts;
    p.stock.visible = false; // at the shoulder, out of sight
    p.scope.visible = Boolean(w.zoom);
    p.body.scale.set(id === 'gavel' ? 1.3 : 1, 1, long ? 1 : 0.5);
    p.barrel.scale.set(id === 'gavel' ? 1.8 : 1, id === 'gavel' ? 1.8 : 1, long ? (w.zoom ? 1.5 : 1) : 0.35);
    p.barrel.position.z = long ? (w.zoom ? -0.52 : -0.42) : -0.2;
    p.mag.visible = id !== 'gavel' && id !== 'longwatch';
    p.mag.scale.y = id === 'wasp' ? 1.3 : long ? 1 : 0.6;
    p.handle.position.z = long ? 0.12 : 0.06;
    this.flash.position.z = long ? (w.zoom ? -0.84 : -0.68) : -0.34;
    this.draw = 0.3; // it comes up into view
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  /** What just happened, shown: streaks for shots, sparks where they land, a kick for your own. */
  show(events, match, viewer) {
    for (const e of events) {
      if (e.type === 'shot') {
        const mine = e.id === viewer?.id && viewer.alive;
        const from = new THREE.Vector3(...e.from);
        if (mine) {
          from.copy(this.flash.getWorldPosition(new THREE.Vector3()));
          this.recoil = Math.min(1, this.recoil + 0.45);
          this.flash.material.opacity = 1;
          this.flash.rotation.z = Math.random() * 6;
        }
        const to = new THREE.Vector3(...e.to);
        const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
        const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: mine ? '#fff3c4' : '#ffe2a0', transparent: true, opacity: mine ? 0.5 : 0.75 }));
        this.scene.add(line);
        this.tracers.push({ line, t: 0 });
        const spark = new THREE.Mesh(new THREE.SphereGeometry(e.hit != null ? 0.13 : 0.07, 8, 6), new THREE.MeshBasicMaterial({ color: e.hit != null ? '#ff4a3a' : '#ffe9b0', transparent: true }));
        spark.position.copy(to);
        this.scene.add(spark);
        this.sparks.push({ mesh: spark, t: 0 });
      } else if (e.type === 'boom') {
        const blast = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.9 }));
        blast.position.set(e.x, 1, e.z);
        this.scene.add(blast);
        this.sparks.push({ mesh: blast, t: 0, grow: 22, life: 1.1 });
      }
    }
  }

  /**
   * Draw a frame: through `viewer`'s eyes if they are alive, else from
   * behind a living teammate.
   */
  _people(match, viewer, dt) {
    this.time += dt;
    for (const p of match.players) {
      const side = match.sideOf(p.squad);
      let b = this.bodies.get(p.id);
      if (b && b.side !== side) {
        this.scene.remove(b.group);
        b = null;
      }
      if (!b) {
        b = this._body(p, side);
        this.bodies.set(p.id, b);
      }
      b.group.visible = !(p === viewer && p.alive);
      b.group.position.set(p.x, p.y, p.z);
      b.group.rotation.y = p.yaw;
      // The dead lie down; the living swing their legs when they walk.
      b.fall = p.alive ? 0 : Math.min(1, b.fall + dt * 3.2);
      b.group.rotation.x = -b.fall * (Math.PI / 2) * 0.96;
      b.group.position.y = p.y + b.fall * 0.25;
      const swing = p.alive && p.moving ? Math.sin(this.time * 11 + p.id) * 0.6 : 0;
      b.legL.rotation.x = swing;
      b.legR.rotation.x = -swing;
      b.gun.rotation.x = p.pitch;
    }
  }

  render(match, viewer, dt, { zoom = false } = {}) {
    this._people(match, viewer, dt);
    // Whose eyes?
    let eye = viewer?.alive ? viewer : match.players.find((p) => p.alive && p.squad === viewer?.squad) ?? match.players.find((p) => p.alive) ?? viewer;
    const first = eye === viewer && viewer?.alive;
    this.watching = first ? null : eye;
    if (first) {
      this.bob = viewer.moving && viewer.y <= 0 ? this.bob + dt * 10 : this.bob;
      this.camera.position.set(viewer.x, viewer.y + PLAYER.eye + (viewer.moving ? Math.sin(this.bob) * 0.035 : 0), viewer.z);
      this.camera.rotation.set(viewer.pitch + this.recoil * 0.035, viewer.yaw, 0);
    } else if (eye) {
      const back = 3.2;
      this.camera.position.set(eye.x + Math.sin(eye.yaw) * back, eye.y + 2.3, eye.z + Math.cos(eye.yaw) * back);
      this.camera.rotation.set(-0.18, eye.yaw, 0);
    }
    const want = first && zoom && WEAPONS[match.weaponOf(viewer)].zoom ? WEAPONS[match.weaponOf(viewer)].zoom : 74;
    this.fov += (want - this.fov) * Math.min(1, dt * 14);
    this.camera.fov = this.fov;
    this.camera.updateProjectionMatrix();
    // The gun in hand: kicks back when fired, dips while reloading, hides through a scope.
    this.gun.visible = Boolean(first) && this.fov > 50;
    if (first) {
      this.holding(match.weaponOf(viewer));
      this.recoil = Math.max(0, this.recoil - dt * 6);
      this.draw = Math.max(0, (this.draw ?? 0) - dt);
      const down = (viewer.reloading > 0 ? 0.16 : 0) + this.draw * 0.6;
      this.gun.position.set(0.17 + (viewer.moving ? Math.cos(this.bob * 0.5) * 0.008 : 0), -0.17 - down + (viewer.moving ? Math.abs(Math.sin(this.bob)) * 0.012 : 0), -0.4 + this.recoil * 0.05);
      this.gun.rotation.set(this.recoil * 0.12 - down * 1.4, 0, viewer.reloading > 0 ? 0.35 : 0);
    }
    this._fade(dt);
    this._charge(match);
    this.renderer.render(this.scene, this.camera);
  }

  _fade(dt) {
    this.flash.material.opacity = Math.max(0, this.flash.material.opacity - dt * 16);
    this.tracers = this.tracers.filter((t) => {
      t.t += dt;
      t.line.material.opacity = Math.max(0, 0.7 - t.t * 7);
      if (t.t < 0.1) return true;
      this.scene.remove(t.line);
      t.line.geometry.dispose();
      return false;
    });
    this.sparks = this.sparks.filter((s) => {
      s.t += dt;
      const life = s.life ?? 0.25;
      s.mesh.material.opacity = Math.max(0, 1 - s.t / life);
      s.mesh.scale.setScalar(1 + s.t * (s.grow ?? 4));
      if (s.t < life) return true;
      this.scene.remove(s.mesh);
      return false;
    });
  }

  /** The charge: on the ground where it was dropped or set. */
  _charge(match) {
    const c = match.charge;
    this.chargeMesh.visible = Boolean(c && (c.state === 'dropped' || c.state === 'planted' || c.state === 'safe'));
    if (this.chargeMesh.visible) {
      this.chargeMesh.position.set(c.x, 0, c.z);
      const rate = c.state === 'planted' ? 2 + (1 - Math.max(0, match.timer) / 35) * 9 : 0;
      this.chargeLight.visible = c.state === 'safe' ? false : rate ? Math.sin(this.time * rate * Math.PI) > 0 : true;
      this.chargeLight.material.color.set(c.state === 'dropped' ? '#ffd24a' : '#ff3b30');
    }
  }

  /** The menu's backdrop: a slow turn high above the map, the gun put away. */
  overview(match, t, dt) {
    this.gun.visible = false;
    this._people(match, null, dt);
    this.camera.fov = this.fov = 60;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(40 + Math.sin(t * 0.07) * 46, 34, 30 + Math.cos(t * 0.07) * 40);
    this.camera.lookAt(46, 0, 30);
    this._fade(dt);
    this._charge(match);
    this.renderer.render(this.scene, this.camera);
    
  }

  dispose() {
    this.renderer.dispose();
    this.canvas.remove();
  }
}
