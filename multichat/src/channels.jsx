// WebSocket channel connection manager

const PING_INTERVAL = 25000;
const PONG_TIMEOUT = 10000;
const MAX_BACKOFF = 30000;
// Old servers never say hello: after this long, treat the connection as ready and the replay as done
const HELLO_FALLBACK = 1000;
// A server that accepts TCP but never answers the upgrade (frozen Mac) would leave us "connecting" forever
const CONNECT_TIMEOUT = 10000;

class ChannelManager {
  constructor({ id, name, wsUrl, httpUrl, onMessage, onEdit, onPermission, onPermissionResolved, onError, onStatus, onSent, onHello, onHistoryEnd, onHistoryPage }) {
    this.id = id;
    this.name = name;
    this.wsUrl = wsUrl;
    this.httpUrl = httpUrl;
    this.onMessage = onMessage;
    this.onEdit = onEdit;
    this.onPermission = onPermission;
    this.onPermissionResolved = onPermissionResolved;
    this.onError = onError;
    this.onStatus = onStatus;
    this.onSent = onSent;
    this.onHello = onHello;
    this.onHistoryEnd = onHistoryEnd;
    this.onHistoryPage = onHistoryPage;
    this.ws = null;
    this.status = 'disconnected';
    this.features = [];
    this.attempt = 0;
    this.nextRetryAt = null;
    this.connectCount = 0;
    // True while the server is replaying history right after (re)connecting
    this.replaying = false;
    // Messages typed while offline, flushed in order on (re)connect
    this.outbox = [];
    this._reconnectTimer = null;
    this._pingTimer = null;
    this._pongTimer = null;
    this._destroyed = false;

    // Phones drop sockets on network switches and sleep: retry right away when we come back,
    // and probe a socket that still claims to be open
    this._wake = () => {
      if (this._destroyed || document.visibilityState === 'hidden') return;
      if (this.status === 'disconnected') this.reconnect();
      else if (this.status === 'connected' && this._heartbeat) this._ping();
    };
    window.addEventListener('online', this._wake);
    document.addEventListener('visibilitychange', this._wake);
  }

  connect() {
    if (this._destroyed) return;
    this._setStatus('connecting');
    let ws;
    try {
      ws = new WebSocket(this.wsUrl);
    } catch {
      this._setStatus('disconnected');
      this._scheduleReconnect();
      return;
    }
    this.ws = ws;
    this._connectTimer = setTimeout(() => {
      if (this.ws !== ws || ws.readyState !== 0) return;
      ws.onclose = null;
      try { ws.close(); } catch {}
      this._dropSocket();
    }, CONNECT_TIMEOUT);

    ws.onopen = () => {
      clearTimeout(this._connectTimer);
      this.attempt = 0;
      this.nextRetryAt = null;
      this.ready = false;
      this.replaying = true;
      this.features = [];
      this.connectCount += 1;
      this._setStatus('connected');
      this._helloTimer = setTimeout(() => {
        this.replaying = false;
        this._markReady();
      }, HELLO_FALLBACK);
    };

    ws.onclose = () => {
      if (this.ws !== ws) return;
      this._dropSocket();
    };

    ws.onerror = () => {};

    ws.onmessage = (e) => {
      // Any frame proves the socket is alive
      clearTimeout(this._pongTimer);
      let data;
      try { data = JSON.parse(e.data); } catch { return; }
      if (data.type === 'pong') {
        // handled above
      } else if (data.type === 'hello') {
        this.features = data.features || [];
        if (this.onHello) this.onHello(this.id, data);
        // Only servers that answer pings get a heartbeat (older ones would be dropped every 35s)
        if (this.features.includes('ping')) this._startHeartbeat();
        // Without history_end support we can't tell where the replay stops; the fallback timer decides
        if (this.features.includes('history_end')) clearTimeout(this._helloTimer);
        this._markReady();
      } else if (data.type === 'history_end') {
        this.replaying = false;
        if (this.onHistoryEnd) this.onHistoryEnd(this.id, data);
      } else if (data.type === 'history_page') {
        if (this.onHistoryPage) this.onHistoryPage(this.id, data);
      } else if (data.type === 'msg' && this.onMessage) {
        this.onMessage(this.id, data, { replay: this.replaying, firstConnect: this.connectCount === 1 });
      } else if (data.type === 'edit' && this.onEdit) {
        this.onEdit(this.id, data);
      } else if (data.type === 'permission_request' && this.onPermission) {
        this.onPermission(this.id, data);
      } else if (data.type === 'permission_resolved' && this.onPermissionResolved) {
        this.onPermissionResolved(this.id, data);
      } else if (data.type === 'error' && this.onError) {
        this.onError(this.id, data);
      }
    };
  }

  disconnect() {
    this._destroyed = true;
    clearTimeout(this._reconnectTimer);
    this._stopTimers();
    window.removeEventListener('online', this._wake);
    document.removeEventListener('visibilitychange', this._wake);
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this._setStatus('disconnected');
  }

  reconnect() {
    this._destroyed = false;
    clearTimeout(this._reconnectTimer);
    this._stopTimers();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.connect();
  }

  // Ask for messages older than `oldest` (the first one we show); answer comes as history_page
  requestOlder(oldest, limit = 50) {
    if (!this.ws || this.ws.readyState !== 1 || !this.features.includes('history_page')) return false;
    this.ws.send(JSON.stringify({ type: 'history_before', before: { ts: oldest.ts, id: oldest.id }, limit }));
    return true;
  }

  hasQueued(id) {
    return this.outbox.some(item => item.id === id);
  }

  // Queues while offline; sends as soon as the connection is ready
  send(id, text) {
    this._enqueue({ kind: 'text', id, text });
  }

  uploadFile(id, text, file) {
    this._enqueue({ kind: 'file', id, text, file });
  }

  respondPermission(id, allowed) {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify({ type: 'permission_response', id, allowed }));
      return true;
    }
    return false;
  }

  _enqueue(item) {
    this.outbox.push(item);
    if (this.ready) this._flush();
  }

  _markReady() {
    clearTimeout(this._helloTimer);
    if (this.ready || !this.ws || this.ws.readyState !== 1) return;
    this.ready = true;
    this._flush();
  }

  async _flush() {
    if (this._flushing) return;
    this._flushing = true;
    try {
      while (this.outbox.length && this.ws && this.ws.readyState === 1) {
        const item = this.outbox[0];
        let payload;
        try {
          payload = item.kind === 'text'
            ? { id: item.id, text: item.text }
            : { type: 'file_upload', id: item.id, text: item.text || '', fileName: item.file.name, fileData: await readBase64(item.file) };
        } catch (err) {
          // Skip the unreadable file, keep sending the rest
          this.outbox.shift();
          if (this.onError) this.onError(this.id, { id: item.id, message: `파일을 읽지 못했습니다: ${item.file.name}` });
          continue;
        }
        const ws = this.ws;
        if (!ws || ws.readyState !== 1) break;
        ws.send(JSON.stringify(payload));
        this.outbox.shift();
        // Start the ack clock only once the bytes have actually left (big uploads take a while)
        this._whenDrained(ws, () => { if (this.onSent) this.onSent(this.id, item.id); });
      }
    } finally {
      this._flushing = false;
    }
  }

  _whenDrained(ws, cb) {
    const check = () => {
      if (ws.readyState !== 1) return;
      if (ws.bufferedAmount === 0) cb();
      else setTimeout(check, 200);
    };
    check();
  }

  // App-level heartbeat: a half-open socket (Mac asleep, phone switched networks) stays
  // readyState 1 for a long time, so a missing pong drops it right away
  _startHeartbeat() {
    this._heartbeat = true;
    clearInterval(this._pingTimer);
    this._pingTimer = setInterval(() => this._ping(), PING_INTERVAL);
  }

  _ping() {
    const ws = this.ws;
    if (!ws || ws.readyState !== 1) return;
    // An upload still draining delays the pong; don't mistake that for a dead socket
    if (ws.bufferedAmount > 0) return;
    ws.send(JSON.stringify({ type: 'ping' }));
    clearTimeout(this._pongTimer);
    this._pongTimer = setTimeout(() => {
      if (this.ws !== ws) return;
      ws.onclose = null;
      try { ws.close(); } catch {}
      this._dropSocket();
    }, PONG_TIMEOUT);
  }

  _dropSocket() {
    this.ws = null;
    this._stopTimers();
    this._setStatus('disconnected');
    if (!this._destroyed) this._scheduleReconnect();
  }

  _stopTimers() {
    this.ready = false;
    this.replaying = false;
    this._heartbeat = false;
    clearTimeout(this._helloTimer);
    clearTimeout(this._connectTimer);
    clearInterval(this._pingTimer);
    clearTimeout(this._pongTimer);
  }

  _setStatus(s) {
    this.status = s;
    // attempt = consecutive tries that never opened a socket (reset in onopen)
    if (this.onStatus) this.onStatus(this.id, s, this.nextRetryAt, this.attempt);
  }

  _scheduleReconnect() {
    clearTimeout(this._reconnectTimer);
    const delay = Math.min(MAX_BACKOFF, 1000 * 2 ** this.attempt);
    this.attempt += 1;
    this.nextRetryAt = Date.now() + delay;
    this._setStatus('disconnected');
    this._reconnectTimer = setTimeout(() => this.connect(), delay);
  }
}

function readBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

window.ChannelManager = ChannelManager;
