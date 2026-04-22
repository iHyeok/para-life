// WebSocket channel connection manager

class ChannelManager {
  constructor({ id, name, wsUrl, httpUrl, onMessage, onEdit, onPermission, onStatus }) {
    this.id = id;
    this.name = name;
    this.wsUrl = wsUrl;
    this.httpUrl = httpUrl;
    this.onMessage = onMessage;
    this.onEdit = onEdit;
    this.onPermission = onPermission;
    this.onStatus = onStatus;
    this.ws = null;
    this.status = 'disconnected';
    this._reconnectTimer = null;
    this._destroyed = false;
  }

  connect() {
    if (this._destroyed) return;
    this._setStatus('connecting');
    try {
      this.ws = new WebSocket(this.wsUrl);
    } catch {
      this._setStatus('disconnected');
      this._scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this._setStatus('connected');
    };

    this.ws.onclose = () => {
      this._setStatus('disconnected');
      if (!this._destroyed) this._scheduleReconnect();
    };

    this.ws.onerror = () => {};

    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'msg' && this.onMessage) {
          this.onMessage(this.id, data);
        } else if (data.type === 'edit' && this.onEdit) {
          this.onEdit(this.id, data);
        } else if (data.type === 'permission_request' && this.onPermission) {
          this.onPermission(this.id, data);
        }
      } catch {}
    };
  }

  disconnect() {
    this._destroyed = true;
    clearTimeout(this._reconnectTimer);
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
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
    }
    this.connect();
  }

  send(id, text) {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify({ id, text }));
    }
  }

  respondPermission(id, allowed) {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify({ type: 'permission_response', id, allowed }));
    }
  }

  async uploadFile(id, text, file) {
    const fd = new FormData();
    fd.set('id', id);
    fd.set('text', text || '');
    fd.set('file', file);
    try {
      const res = await fetch(`${this.httpUrl}/upload`, { method: 'POST', body: fd });
      if (!res.ok) console.error('upload failed:', res.status, await res.text());
    } catch (err) {
      console.error('upload error:', err);
    }
  }

  _setStatus(s) {
    this.status = s;
    if (this.onStatus) this.onStatus(this.id, s);
  }

  _scheduleReconnect() {
    clearTimeout(this._reconnectTimer);
    this._reconnectTimer = setTimeout(() => this.connect(), 3000);
  }
}

window.ChannelManager = ChannelManager;
