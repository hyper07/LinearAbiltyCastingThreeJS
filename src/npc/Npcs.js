import { AnimationMixer, Box3, CapsuleGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { normalizeMixamoBones } from '../animation/CharacterController.js';
import { StudySession } from './Study.js';

/**
 * Helper NPCs standing in a level: a guide who talks (scripted lines, or the
 * AI model in character), a merchant, a healer, a quest-giver. They never
 * fight and monsters ignore them. A tutor asks study questions (npc/Study.js)
 * and pays out for right answers.
 *
 * Level data: { id, name, role, model, x, z, yaw, greeting, lines[], ai,
 *               persona, gift, quest, study }
 */

export const NPC_ROLES = {
  guide: { label: 'Guide', color: '#7fd6ff' },
  merchant: { label: 'Merchant', color: '#ffd166' },
  healer: { label: 'Healer', color: '#6fe3b0' },
  quest: { label: 'Quest giver', color: '#ff9a3c' },
  tutor: { label: 'Tutor', color: '#b8f06a' }
};

export const TALK_RANGE = 2.8;

const loader = new GLTFLoader();
const templates = new Map();
let mixamoIdle = null;
/** The game's own Mixamo idle, for rigged bodies that bring no clips of their own. */
const loadMixamoIdle = () => (mixamoIdle ??= new FBXLoader().loadAsync('./models/Idle.fbx').then((fbx) => fbx.animations?.[0] ?? null));

/** Rigged characters in the library that can stand in as NPCs. */
export function npcModels(catalog) {
  // Humanoid bodies only: KayKit's adventurers and skeletons, and your own
  // characters. (Some packs ship rigged props that the catalog files as characters.)
  return catalog.models.filter(
    (m) =>
      m.category === 'character' &&
      m.rigged &&
      (m.source === 'kaykit' || m.source === 'custom') &&
      (m.animations?.length || m.rig === 'mixamo')
  );
}

export class Npc {
  constructor(data, catalog, heightAt) {
    this.data = data;
    this.root = new Group();
    this.root.name = `npc-${data.id}`;
    this.root.position.set(data.x, heightAt(data.x, data.z), data.z);
    this.root.rotation.y = data.yaw ?? 0;
    this.baseYaw = data.yaw ?? 0;
    this.mixer = null;
    this.ready = this._build(catalog);
    /** Per-run state: quest progress, whether the gift was given. */
    this.state = { questAccepted: false, questDone: false, questTurnedIn: false, progress: 0, gifted: false, stock: null, history: [], lineIndex: 0 };
    /** A tutor's lessons for this run. */
    this.study = data.role === 'tutor' && data.study ? new StudySession(data.study) : null;
  }

  get position() {
    return this.root.position;
  }

  async _build(catalog) {
    const models = npcModels(catalog);
    const model = models.find((m) => m.id === this.data.model) ?? models[0];
    if (model) {
      try {
        if (!templates.has(model.id)) templates.set(model.id, loader.loadAsync(catalog.url(model.file)));
        const gltf = await templates.get(model.id);
        const body = cloneSkinned(gltf.scene);
        // Measure the body as it actually stands (skinning included) — catalog
        // boxes can be in bind space, sideways for some converted files.
        body.updateMatrixWorld(true);
        const height = new Box3().setFromObject(body, true).getSize(new Vector3()).y;
        body.scale.setScalar(1.85 / Math.max(0.05, height));
        body.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.frustumCulled = false;
          }
        });
        this.root.add(body);
        this.mixer = new AnimationMixer(body);
        let idle = gltf.animations.find((a) => a.name === 'Idle') ?? gltf.animations.find((a) => /idle/i.test(a.name)) ?? gltf.animations[0];
        if (!idle && model.rig === 'mixamo') {
          normalizeMixamoBones(body);
          idle = await loadMixamoIdle();
        }
        if (idle) this.mixer.clipAction(idle).play();
        return;
      } catch (error) {
        console.warn(`[Npc] ${model.id}: ${error.message}`);
      }
    }
    // No library yet: a simple robed figure in the role's colour.
    const robe = new Mesh(new CapsuleGeometry(0.32, 1.0, 4, 12), new MeshStandardMaterial({ color: NPC_ROLES[this.data.role]?.color ?? '#aaaaaa', roughness: 0.8 }));
    robe.position.y = 0.85;
    const head = new Mesh(new SphereGeometry(0.22, 16, 12), new MeshStandardMaterial({ color: '#e8c9a8', roughness: 0.7 }));
    head.position.y = 1.65;
    this.root.add(robe, head);
  }

  update(dt, player) {
    this.mixer?.update(dt);
    // Turn toward the caster when they come close; back to the post otherwise.
    let target = this.baseYaw;
    if (player && Math.hypot(player.x - this.position.x, player.z - this.position.z) < TALK_RANGE * 2) {
      target = Math.atan2(player.x - this.position.x, player.z - this.position.z);
    }
    let delta = target - this.root.rotation.y;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    this.root.rotation.y += delta * Math.min(1, dt * 4);
  }

  dispose() {
    this.mixer?.stopAllAction();
    this.root.removeFromParent();
  }
}

/** The NPCs of the level being played. */
export class NpcSystem {
  constructor(scene, labels, catalog) {
    this.scene = scene;
    this.labels = labels;
    this.catalog = catalog;
    this.npcs = [];
    this.nearest = null;
  }

  setNpcs(list, heightAt) {
    this.clear();
    for (const data of list) {
      const npc = new Npc(data, this.catalog, heightAt);
      this.scene.add(npc.root);
      npc.nameLabel = this.labels.add(npc.position, data.name, { className: 'world-label--npc', offset: 2.35, maxDistance: 45, color: NPC_ROLES[data.role]?.color });
      npc.markLabel = this.labels.add(npc.position, '', { className: 'world-label--mark', offset: 2.85, maxDistance: 60 });
      this.npcs.push(npc);
    }
    this.prompt ??= null;
    this.refreshMarks();
  }

  /** "!" a quest to take, "?" a quest to hand in, "✎" a tutor with lessons. */
  refreshMarks() {
    for (const npc of this.npcs) {
      const q = npc.data.quest;
      const s = npc.state;
      let mark = !q || s.questTurnedIn ? '' : s.questDone ? '?' : s.questAccepted ? '' : '!';
      if (!mark && npc.study?.hasQuestions) mark = '✎';
      npc.markLabel.setText(mark);
      npc.markLabel.setVisible(Boolean(mark));
    }
  }

  /** Colliders, so the caster walks around them rather than through. */
  get obstacles() {
    return this.npcs.map((n) => ({ x: n.position.x, z: n.position.z, radius: 0.55 }));
  }

  clear() {
    for (const npc of this.npcs) {
      npc.nameLabel?.remove();
      npc.markLabel?.remove();
      npc.dispose();
    }
    this.npcs = [];
    this.nearest = null;
  }

  /** @returns {Npc|null} the NPC close enough to talk to */
  update(dt, player) {
    let best = null;
    let bestD = TALK_RANGE;
    for (const npc of this.npcs) {
      npc.update(dt, player);
      const d = player ? Math.hypot(player.x - npc.position.x, player.z - npc.position.z) : Infinity;
      if (d < bestD) {
        best = npc;
        bestD = d;
      }
    }
    this.nearest = best;
    return best;
  }

  /** Count a kill toward every accepted quest. */
  onKill(kind) {
    let changed = false;
    for (const npc of this.npcs) {
      const q = npc.data.quest;
      const s = npc.state;
      if (!q || !s.questAccepted || s.questDone) continue;
      if (q.target !== 'any' && q.target !== kind) continue;
      s.progress += 1;
      if (s.progress >= q.count) s.questDone = true;
      changed = true;
    }
    if (changed) this.refreshMarks();
    return changed;
  }

  activeQuests() {
    return this.npcs
      .filter((n) => n.data.quest && n.state.questAccepted && !n.state.questTurnedIn)
      .map((n) => ({ npc: n, quest: n.data.quest, progress: n.state.progress, done: n.state.questDone }));
  }
}
