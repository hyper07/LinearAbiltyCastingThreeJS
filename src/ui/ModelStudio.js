import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { CATEGORIES } from '../library/categories.js';

const SCENERY = Object.keys(CATEGORIES).filter((c) => c !== 'character' && c !== 'creature');

/** Any supported 3D file → GLB bytes, so the server only ever stores one format. */
async function toGlb(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'glb') return new Uint8Array(await file.arrayBuffer());
  const url = URL.createObjectURL(file);
  try {
    let scene;
    let animations = [];
    if (ext === 'gltf') {
      const gltf = await new GLTFLoader().loadAsync(url);
      scene = gltf.scene;
      animations = gltf.animations;
    } else if (ext === 'fbx') {
      scene = await new FBXLoader().loadAsync(url);
      animations = scene.animations ?? [];
    } else if (ext === 'obj') {
      scene = await new OBJLoader().loadAsync(url);
    } else {
      throw new Error('use a .glb, .gltf, .fbx or .obj file');
    }
    const out = await new GLTFExporter().parseAsync(scene, { binary: true, animations, onlyVisible: true });
    return new Uint8Array(out);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function base64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** An image file → a PNG data URI no larger than 1024 px, to keep uploads small. */
async function imageDataUri(file, max = 1024) {
  const bitmap = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * k);
  canvas.height = Math.round(bitmap.height * k);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

/**
 * The main menu's **Create** tab: upload a 3D file or turn a picture into a
 * 3D model, then use it on maps, as your character's body, or for NPCs.
 * Storage and generation happen on the server (server/modelgen.mjs).
 */
export class ModelStudio {
  /**
   * @param {HTMLElement} host
   * @param {{ onChanged: () => Promise<void>, onWear: (lookId: string) => Promise<void>, currentClass: () => string|null }} actions
   */
  constructor(host, actions) {
    this.actions = actions;
    this.root = host;
    this.root.innerHTML = `
      <div class="studio">
        <section class="studio__card">
          <h3>Upload a 3D model</h3>
          <p class="main-menu__panel-hint">GLB, glTF, FBX or OBJ. A rigged humanoid (e.g. auto-rigged on mixamo.com) can be worn as your character.</p>
          <input type="file" data-up-file accept=".glb,.gltf,.fbx,.obj" />
          <input type="text" data-up-name placeholder="Name" maxlength="60" />
          <select data-up-use></select>
          <button type="button" class="main-menu__world-btn main-menu__world-btn--primary" data-up-go>Upload</button>
          <div class="studio__status" data-up-status></div>
        </section>
        <section class="studio__card">
          <h3>Make 3D from a picture</h3>
          <p class="main-menu__panel-hint" data-gen-provider>Checking the generator…</p>
          <input type="file" data-gen-file accept="image/png,image/jpeg,image/webp" />
          <img class="studio__preview" data-gen-preview alt="" hidden />
          <input type="text" data-gen-name placeholder="Name" maxlength="60" />
          <select data-gen-use></select>
          <button type="button" class="main-menu__world-btn main-menu__world-btn--primary" data-gen-go>Generate</button>
          <div class="studio__progress" data-gen-progress hidden><i></i></div>
          <div class="studio__status" data-gen-status></div>
        </section>
        <section class="studio__card studio__card--list">
          <h3>My models</h3>
          <div class="studio__list" data-list></div>
        </section>
      </div>`;
    this.$ = (s) => this.root.querySelector(s);
    const useOptions = `<option value="character">My character (rigged humanoid)</option>${SCENERY.map((c) => `<option value="${c}">Map object — ${CATEGORIES[c].label}</option>`).join('')}`;
    this.$('[data-up-use]').innerHTML = useOptions;
    this.$('[data-gen-use]').innerHTML = useOptions;
    this.$('[data-up-use]').value = 'prop';
    this.$('[data-gen-use]').value = 'character';
    this.$('[data-up-file]').addEventListener('change', (e) => {
      const f = e.target.files?.[0];
      if (f && !this.$('[data-up-name]').value) this.$('[data-up-name]').value = f.name.replace(/\.[^.]+$/, '');
    });
    this.$('[data-gen-file]').addEventListener('change', (e) => {
      const f = e.target.files?.[0];
      const img = this.$('[data-gen-preview]');
      if (!f) return (img.hidden = true);
      img.src = URL.createObjectURL(f);
      img.hidden = false;
      if (!this.$('[data-gen-name]').value) this.$('[data-gen-name]').value = f.name.replace(/\.[^.]+$/, '');
    });
    this.$('[data-up-go]').addEventListener('click', () => this.upload());
    this.$('[data-gen-go]').addEventListener('click', () => this.generate());
    this.root.addEventListener('keydown', (e) => e.stopPropagation());
    this.refresh();
  }

  _status(which, text, error = false) {
    const el = this.$(`[data-${which}-status]`);
    el.textContent = text;
    el.classList.toggle('is-error', error);
  }

  async refresh() {
    let data = { models: [], provider: null };
    try {
      data = await (await fetch('./api/models')).json();
    } catch {
      /* built game without the server */
    }
    const names = { tripo: 'Tripo3D', meshy: 'Meshy', mock: 'the test generator (no network)' };
    this.$('[data-gen-provider]').textContent = data.provider
      ? `Uses ${names[data.provider]}. Characters are rigged and animated automatically. Takes 1–3 minutes.`
      : 'Not set up yet: add TRIPO_API_KEY (or MESHY_API_KEY) to .env and restart `npm run dev`.';
    this.$('[data-gen-go]').disabled = !data.provider;
    const list = this.$('[data-list]');
    list.replaceChildren();
    if (!data.models.length) {
      list.innerHTML = '<p class="main-menu__panel-hint">Nothing yet — upload or generate one.</p>';
      return;
    }
    for (const m of [...data.models].reverse()) {
      const row = document.createElement('div');
      row.className = 'studio__item';
      const info = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = m.name;
      const meta = document.createElement('span');
      const rig = m.rig === 'mixamo' ? 'Mixamo rig — uses the game’s animations' : m.rigged ? `rigged, ${m.animations.length} clips` : 'static';
      meta.textContent = `${m.kind === 'character' ? 'Character' : `Map object · ${m.category}`} · ${rig} · ${m.author}`;
      info.append(name, meta);
      row.append(info);
      if (m.kind === 'character') {
        const wear = document.createElement('button');
        wear.type = 'button';
        wear.className = 'main-menu__world-btn';
        wear.textContent = 'Wear';
        wear.title = 'Use as the body of the selected class';
        wear.addEventListener('click', async () => {
          wear.disabled = true;
          await this.actions.onWear(`custom:${m.slug}`);
          wear.disabled = false;
        });
        row.append(wear);
      }
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'main-menu__world-btn';
      del.textContent = 'Delete';
      del.addEventListener('click', async () => {
        if (!confirm(`Delete ${m.name}?`)) return;
        await fetch(`./api/models/${m.slug}`, { method: 'DELETE' });
        await this.actions.onChanged();
        this.refresh();
      });
      row.append(del);
      list.append(row);
    }
  }

  async upload() {
    const file = this.$('[data-up-file]').files?.[0];
    if (!file) return this._status('up', 'Choose a file first.', true);
    const use = this.$('[data-up-use]').value;
    const button = this.$('[data-up-go]');
    button.disabled = true;
    try {
      this._status('up', 'Converting…');
      const glb = await toGlb(file);
      this._status('up', `Uploading ${(glb.length / 1048576).toFixed(1)} MB…`);
      const response = await fetch('./api/models/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this.$('[data-up-name]').value || file.name,
          kind: use === 'character' ? 'character' : 'object',
          category: use === 'character' ? 'misc' : use,
          glb: base64(glb)
        })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
      const m = body.model;
      this._status(
        'up',
        use === 'character' && m.kind !== 'character'
          ? `Saved “${m.name}” — but it has no skeleton, so it is a map object, not a character.`
          : `Saved “${m.name}”.`
      );
      await this.actions.onChanged();
      this.refresh();
    } catch (error) {
      this._status('up', `Failed: ${error.message}`, true);
    } finally {
      button.disabled = false;
    }
  }

  async generate() {
    const file = this.$('[data-gen-file]').files?.[0];
    if (!file) return this._status('gen', 'Choose a picture first.', true);
    const use = this.$('[data-gen-use]').value;
    const button = this.$('[data-gen-go]');
    const bar = this.$('[data-gen-progress]');
    button.disabled = true;
    bar.hidden = false;
    bar.firstElementChild.style.width = '2%';
    try {
      const image = await imageDataUri(file);
      const response = await fetch('./api/models/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this.$('[data-gen-name]').value || file.name,
          image,
          kind: use === 'character' ? 'character' : 'object',
          category: use === 'character' ? 'misc' : use
        })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
      let job = body.job;
      while (job.state === 'running') {
        this._status('gen', `${job.step}… ${Math.round(job.progress * 100)}%`);
        bar.firstElementChild.style.width = `${Math.max(2, job.progress * 100)}%`;
        await new Promise((r) => setTimeout(r, 1500));
        job = (await (await fetch(`./api/models/jobs/${job.id}`)).json()).job;
      }
      if (job.state === 'failed') throw new Error(job.error);
      bar.firstElementChild.style.width = '100%';
      this._status('gen', `Made “${job.model.name}”${job.note ? ` — ${job.note}` : '.'}`);
      await this.actions.onChanged();
      this.refresh();
    } catch (error) {
      this._status('gen', `Failed: ${error.message}`, true);
    } finally {
      button.disabled = false;
      setTimeout(() => (bar.hidden = true), 1500);
    }
  }
}
