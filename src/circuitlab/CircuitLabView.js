/**
 * Circuit Lab on the platform: the lab is its own React app
 * (apps/circuitlab, served at ./circuitlab/), shown full screen over the home
 * page in a frame. Its Home button posts `circuitlab:close`; it posts
 * `circuitlab:ready` once the bench is up. Exposed as `window.circuitlab`
 * while open (the e2e checks and the cover script use it), like the games.
 */
const CSS = `
.circuitlab-host{position:fixed;inset:0;z-index:60;background:#15171c;display:flex}
.circuitlab-host iframe{flex:1;width:100%;height:100%;border:0;display:block;background:#15171c}
.circuitlab-host__veil{position:absolute;inset:0;display:grid;place-items:center;color:#cfd6df;font:600 15px system-ui,sans-serif;pointer-events:none;transition:opacity .4s}
.circuitlab-host.is-ready .circuitlab-host__veil{opacity:0}
`;

export class CircuitLabView {
  /**
   * @param {HTMLElement} host
   * @param {{ onClose?: () => void, src?: string }} [opts]
   */
  constructor(host, { onClose = () => {}, src = './circuitlab/' } = {}) {
    this.host = host;
    this.onClose = onClose;
    this.src = src;
    this.root = null;
    this.frame = null;
    this.ready = false;
    this.mode = 'loading';
    this.onMessage = (e) => {
      if (e.origin !== window.location.origin || e.source !== this.frame?.contentWindow) return;
      if (e.data?.type === 'circuitlab:ready') {
        this.ready = true;
        this.mode = 'lab';
        this.root?.classList.add('is-ready');
        this.frame?.focus();
      } else if (e.data?.type === 'circuitlab:close') {
        this.close();
      }
    };
  }

  async open() {
    if (!document.querySelector('style[data-circuitlab-host]')) {
      const s = document.createElement('style');
      s.dataset.circuitlabHost = '';
      s.textContent = CSS;
      document.head.append(s);
    }
    const root = document.createElement('div');
    root.className = 'circuitlab-host';
    root.dataset.circuitlab = '';
    const frame = document.createElement('iframe');
    frame.src = this.src;
    frame.title = 'Circuit Lab';
    frame.allow = 'fullscreen; clipboard-write';
    const veil = document.createElement('div');
    veil.className = 'circuitlab-host__veil';
    veil.textContent = 'Opening Circuit Lab…';
    root.append(frame, veil);
    this.host.append(root);
    this.root = root;
    this.frame = frame;
    window.addEventListener('message', this.onMessage);
    window.circuitlab = this;
    return this;
  }

  /** the lab's own API (window.circuitlab inside the frame), once it is up */
  get lab() {
    try {
      return this.frame?.contentWindow?.circuitlab ?? null;
    } catch {
      return null;
    }
  }

  close() {
    if (!this.root) return;
    window.removeEventListener('message', this.onMessage);
    this.root.remove();
    this.root = null;
    this.frame = null;
    this.ready = false;
    this.mode = 'closed';
    if (window.circuitlab === this) delete window.circuitlab;
    this.onClose();
  }
}
