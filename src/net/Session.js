import { EventEmitter } from '../utils/EventEmitter.js';

/**
 * The socket to the party server (server/realtime.js): one WebSocket at
 * `/ws` on the game's own origin, rooms by join code, and messages relayed
 * between members. This layer knows nothing about the game — it moves JSON.
 *
 * Emits: `joined` ({ room, you, host, peers }), `peer` (peer), `left` (id, name),
 * `closed` (reason), `disconnected`, `message` (msg with `from`).
 */
export class Session extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.id = null;
    this.room = null;
    this.host = null;
    this.cap = 4;
    this.maxPlayers = 4;
    /** id → { id, name } for everyone in the room, including you. */
    this.peers = new Map();
    this._pending = null;
    this._open = null;
  }

  get isHost() {
    return this.id != null && this.id === this.host;
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /** The endpoint, next to the page: `/ws` under whatever path the game is served from. */
  static url() {
    const url = new URL('ws', document.baseURI);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return url.href;
  }

  /** Open the socket (once). Resolves when the server has said hello. */
  connect() {
    if (this.connected) return Promise.resolve();
    if (this._open) return this._open;
    this._open = new Promise((resolve, reject) => {
      let ws;
      try {
        ws = new WebSocket(Session.url());
      } catch (error) {
        this._open = null;
        return reject(error);
      }
      this.ws = ws;
      const timer = setTimeout(() => {
        reject(new Error('The party server did not answer.'));
        ws.close();
      }, 8000);
      ws.addEventListener('message', (event) => {
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }
        if (msg?.t === 'hello' && this.id == null) {
          clearTimeout(timer);
          this.id = msg.id;
          this.maxPlayers = msg.maxPlayers ?? 4;
          resolve();
        }
        this._receive(msg);
      });
      ws.addEventListener('error', () => {
        clearTimeout(timer);
        this._open = null;
        reject(new Error('Could not reach the party server.'));
      });
      ws.addEventListener('close', () => {
        clearTimeout(timer);
        const wasIn = this.room != null;
        this.ws = null;
        this.id = null;
        this._open = null;
        this._clearRoom();
        this._pending?.reject(new Error('The connection closed.'));
        this._pending = null;
        if (wasIn) this.emit('disconnected');
      });
    });
    return this._open;
  }

  _clearRoom() {
    this.room = null;
    this.host = null;
    this.peers.clear();
  }

  _receive(msg) {
    switch (msg.t) {
      case 'hello':
        return;
      case 'joined':
        this.room = msg.room;
        this.host = msg.host;
        this.cap = msg.cap ?? this.cap;
        this.peers = new Map((msg.peers ?? []).map((p) => [p.id, p]));
        this._pending?.resolve(msg);
        this._pending = null;
        this.emit('joined', msg);
        return;
      case 'peer':
        this.peers.set(msg.peer.id, msg.peer);
        this.emit('peer', msg.peer);
        return;
      case 'left':
        if (msg.you) {
          this._clearRoom();
          return;
        }
        this.peers.delete(msg.id);
        this.emit('left', msg.id, msg.name);
        return;
      case 'closed':
        this._clearRoom();
        this.emit('closed', msg.reason);
        return;
      case 'error':
        if (this._pending) {
          this._pending.reject(new Error(msg.message ?? msg.code ?? 'error'));
          this._pending = null;
        } else {
          this.emit('error', msg);
        }
        return;
      default:
        this.emit('message', msg);
    }
  }

  _request(msg) {
    return this.connect().then(
      () =>
        new Promise((resolve, reject) => {
          this._pending?.reject(new Error('superseded'));
          this._pending = { resolve, reject };
          this.send(msg);
        })
    );
  }

  /** Open a party. Resolves with the `joined` message (room code in `room`). */
  create(name) {
    return this._request({ t: 'create', name });
  }

  /** Join a party by code. */
  join(code, name) {
    return this._request({ t: 'join', code, name });
  }

  leave() {
    if (this.room) this.send({ t: 'leave' });
    this._clearRoom();
  }

  send(msg) {
    if (!this.connected) return false;
    this.ws.send(JSON.stringify(msg));
    return true;
  }

  sendTo(id, msg) {
    return this.send({ ...msg, to: id });
  }

  close() {
    this.leave();
    this.ws?.close();
  }
}
