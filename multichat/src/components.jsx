// Presentational components for multichat

const { useState, useEffect, useRef, useMemo, useLayoutEffect } = React;

// ---- Time formatting ----
function formatClock(ts) {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = ((h + 11) % 12) + 1;
  return `${ampm} ${h12}:${m}`;
}

function formatDay(ts) {
  const d = new Date(ts);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const thatDay = new Date(d); thatDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today - thatDay) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return ['일', '월', '화', '수', '목', '금', '토'][d.getDay()] + '요일';
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function formatRelativeTs(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  if (mins < 1440) return `${Math.floor(mins / 60)}시간 전`;
  return `${Math.floor(mins / 1440)}일 전`;
}

// ---- Markdown (assistant replies) ----
// Claude's text can echo prompt-injected content, so only plain markdown output survives:
// raw HTML is shown as text, and remote images become links (no auto-loading tracking pixels)
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const md = window.marked ? new window.marked.Marked({
  gfm: true,
  breaks: true,
  renderer: {
    html({ text }) { return escapeHtml(text); },
    image({ href, text }) { return `<a href="${escapeHtml(href)}">🖼 ${escapeHtml(text || href)}</a>`; },
  },
}) : null;

const MD_SANITIZE = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'del', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'a',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'input'],
  ALLOWED_ATTR: ['href', 'title', 'align', 'type', 'checked', 'disabled'],
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
};

if (window.DOMPurify) {
  window.DOMPurify.addHook('afterSanitizeAttributes', node => {
    if (node.tagName === 'A' && node.getAttribute('href')) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
    // GFM task-list checkboxes only
    if (node.tagName === 'INPUT' && node.getAttribute('type') !== 'checkbox') node.remove();
    if (node.tagName === 'INPUT') node.setAttribute('disabled', '');
  });
}

function renderMarkdown(text) {
  if (!md || !window.DOMPurify) return null;
  return window.DOMPurify.sanitize(md.parse(text), MD_SANITIZE);
}

// ---- Channel Avatar ----
function ChannelAvatar({ name, color, size = 40, status }) {
  const initial = (name || '?').trim().charAt(0);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color + '26', color: color,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 600, fontSize: size * 0.42,
      flexShrink: 0, position: 'relative',
      border: `1px solid ${color}33`,
    }}>
      {initial}
      {status && (
        <span style={{
          position: 'absolute', bottom: 0, right: 0,
          width: size * 0.28, height: size * 0.28,
          borderRadius: '50%',
          background: status === 'connected' ? '#22C55E' : status === 'connecting' ? '#f59e0b' : '#ef4444',
          border: '2px solid var(--panel)',
        }} />
      )}
    </div>
  );
}

// ---- Channel list item ----
function ChannelListItem({ channel, active, onClick, density }) {
  const last = channel.messages[channel.messages.length - 1];
  const pad = density === 'compact' ? '10px 14px' : '14px 16px';

  return (
    <button
      onClick={onClick}
      className="focus-ring"
      style={{
        display: 'flex', gap: 12, alignItems: 'flex-start',
        width: '100%', textAlign: 'left',
        padding: pad,
        background: active ? 'var(--active)' : 'transparent',
        border: 'none',
        borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
        cursor: 'pointer',
        transition: 'background .12s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--hover)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? 'var(--active)' : 'transparent'; }}
    >
      <ChannelAvatar name={channel.name} color={channel.color} size={density === 'compact' ? 34 : 40} status={channel.status} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
          <span style={{
            fontWeight: channel.unreadCount ? 600 : 500,
            fontSize: 14, color: 'var(--ink)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{channel.name}</span>
          {last && (
            <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
              {formatRelativeTs(last.ts)}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            fontSize: 13,
            color: channel.unreadCount ? 'var(--ink-2)' : 'var(--ink-3)',
            fontWeight: channel.unreadCount ? 500 : 400,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>
            {last ? (last.from === 'user' ? '나: ' : '') + last.text : channel.status === 'connected' ? '연결됨' : '연결 안됨'}
          </div>
          {channel.pendingPermissions.length > 0 && (
            <span style={{
              background: 'var(--warn-bg)', color: 'var(--warn-ink)', border: '1px solid var(--warn-line)',
              fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 10, whiteSpace: 'nowrap',
            }}>🔐 승인 대기</span>
          )}
          {channel.unreadCount > 0 && (
            <span style={{
              background: 'var(--accent)', color: 'var(--accent-ink)',
              fontSize: 11, fontWeight: 600,
              padding: '2px 7px', borderRadius: 10,
              minWidth: 20, textAlign: 'center', lineHeight: 1.3,
            }}>{channel.unreadCount}</span>
          )}
        </div>
      </div>
    </button>
  );
}

// ---- Add channel dialog ----
function AddChannelDialog({ onAdd, onClose }) {
  const [name, setName] = useState('');
  const [wsUrl, setWsUrl] = useState('wss://');
  const [httpUrl, setHttpUrl] = useState('https://');
  const nameRef = useRef(null);

  useEffect(() => { if (nameRef.current) nameRef.current.focus(); }, []);

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim() || !wsUrl.trim()) return;
    onAdd({
      // Names can be Korean or repeat: ids must not depend on them
      id: 'ch-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name.trim(),
      wsUrl: wsUrl.trim(),
      httpUrl: httpUrl.trim(),
      color: window.pickColor(Math.floor(Math.random() * 10)),
    });
    onClose();
  };

  const inputStyle = {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    border: '1px solid var(--line-2)', background: 'var(--bg)',
    fontSize: 13, color: 'var(--ink)', fontFamily: 'inherit', outline: 'none',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} style={{
        width: 'min(340px, calc(100vw - 32px))', background: 'var(--panel)', border: '1px solid var(--line)',
        borderRadius: 16, padding: 20,
        boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>채널 추가</div>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'JetBrains Mono, monospace' }}>이름</div>
          <input ref={nameRef} value={name} onChange={e => setName(e.target.value)} placeholder="My Project" style={inputStyle} />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'JetBrains Mono, monospace' }}>WebSocket URL</div>
          <input value={wsUrl} onChange={e => setWsUrl(e.target.value)} placeholder="wss://api.example.com/ws" style={{...inputStyle, fontFamily: 'JetBrains Mono, monospace', fontSize: 12}} />
        </label>
        <label style={{ display: 'block', marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'JetBrains Mono, monospace' }}>HTTP URL</div>
          <input value={httpUrl} onChange={e => setHttpUrl(e.target.value)} placeholder="https://api.example.com" style={{...inputStyle, fontFamily: 'JetBrains Mono, monospace', fontSize: 12}} />
        </label>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{
            padding: '8px 16px', borderRadius: 8, border: '1px solid var(--line-2)',
            background: 'transparent', color: 'var(--ink-2)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
          }}>취소</button>
          <button type="submit" disabled={!name.trim() || !wsUrl.trim()} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: name.trim() && wsUrl.trim() ? 'var(--accent)' : 'var(--line-2)',
            color: name.trim() && wsUrl.trim() ? 'var(--accent-ink)' : 'var(--ink-3)',
            cursor: name.trim() && wsUrl.trim() ? 'pointer' : 'default', fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
          }}>연결</button>
        </div>
      </form>
    </div>
  );
}

// ---- Sidebar ----
function Sidebar({ channels, activeId, onSelect, onAdd, density }) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <aside className="sidebar" style={{
      borderRight: '1px solid var(--line)',
      background: 'var(--panel)', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 7,
              background: 'var(--ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--panel)', fontWeight: 700, fontSize: 13,
            }}>채</div>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>채널</span>
          </div>
          <button onClick={() => setShowAdd(true)} className="focus-ring" title="채널 추가" aria-label="채널 추가" style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'transparent', border: '1px solid var(--line-2)',
            color: 'var(--ink-2)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </div>
      </div>

      {/* Channel list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {channels.length > 0 ? channels.map(ch => (
          <ChannelListItem
            key={ch.id}
            channel={ch}
            active={ch.id === activeId}
            onClick={() => onSelect(ch.id)}
            density={density}
          />
        )) : (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
            채널이 없습니다. + 버튼으로 추가하세요.
          </div>
        )}
      </div>

      {showAdd && <AddChannelDialog onAdd={onAdd} onClose={() => setShowAdd(false)} />}
    </aside>
  );
}

// ---- Message bubble ----
function isImageFile(name) {
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name || '');
}

function MessageStatus({ msg, connected, onRetry }) {
  if (msg.status === 'failed') {
    return (
      <button onClick={() => onRetry(msg.id)} style={{
        border: 'none', background: 'transparent', padding: 0, cursor: 'pointer',
        fontSize: 11, color: 'var(--danger)', fontWeight: 500,
      }}>전송 실패 · 다시 보내기</button>
    );
  }
  if (msg.status === 'pending') {
    return (
      <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
        {connected ? '전송 중…' : '연결되면 전송됩니다'}
      </span>
    );
  }
  return null;
}

function MessageBubble({ msg, isMe, showTime, grouped, httpUrl, connected, onRetry, onMediaLoad }) {
  const align = isMe ? 'flex-end' : 'flex-start';
  const bubbleStyle = {
    padding: '9px 13px', borderRadius: 14,
    maxWidth: 'min(540px, 85%)', fontSize: 14, lineHeight: 1.45,
    wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap', minWidth: 0,
  };
  if (isMe) {
    Object.assign(bubbleStyle, {
      background: 'var(--accent)', color: 'var(--accent-ink)',
      borderBottomRightRadius: grouped ? 14 : 4,
      opacity: msg.status === 'pending' ? 0.7 : 1,
    });
  } else {
    Object.assign(bubbleStyle, {
      background: 'var(--bubble-them)', color: 'var(--ink)',
      borderBottomLeftRadius: grouped ? 14 : 4,
      border: '1px solid var(--line)',
    });
  }

  const file = msg.file;
  const fileUrl = file && file.url
    ? (/^(https?:|blob:)/.test(file.url) ? file.url : (httpUrl || '') + file.url)
    : null;
  const fileIsImage = file && isImageFile(file.name);
  const html = !isMe && msg.text ? renderMarkdown(msg.text) : null;

  return (
    <div className="msg-in" style={{ display: 'flex', flexDirection: 'column', alignItems: align, marginTop: grouped ? 3 : 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flexDirection: isMe ? 'row-reverse' : 'row', maxWidth: '100%' }}>
        <div style={bubbleStyle}>
          {msg.text && (html != null
            ? <div className="md" dangerouslySetInnerHTML={{ __html: html }} />
            : <div>{msg.text}</div>)}
          {file && fileIsImage && fileUrl && (
            <a href={fileUrl} target="_blank" rel="noopener" style={{ display: 'block', marginTop: msg.text ? 6 : 0 }}>
              <img src={fileUrl} alt={file.name} onLoad={onMediaLoad} style={{
                maxWidth: 'min(300px, 100%)', maxHeight: 240, borderRadius: 8, display: 'block',
              }} />
            </a>
          )}
          {file && (!fileIsImage || !fileUrl) && (
            <a href={fileUrl || undefined} download={file.name} target="_blank" rel="noopener" style={{
              display: 'flex', alignItems: 'center', gap: 6, marginTop: msg.text ? 6 : 0,
              fontSize: 13, color: isMe ? 'var(--accent-ink)' : 'var(--accent)',
              textDecoration: 'underline',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
              {file.name}
            </a>
          )}
        </div>
        {showTime && (
          <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono, monospace', marginBottom: 2, whiteSpace: 'nowrap' }}>
            {msg.edited && '수정됨 · '}{formatClock(msg.ts)}
          </div>
        )}
      </div>
      {isMe && msg.status && msg.status !== 'sent' && (
        <div style={{ marginTop: 3 }}>
          <MessageStatus msg={msg} connected={connected} onRetry={onRetry} />
        </div>
      )}
    </div>
  );
}

// ---- Permission request ----
function PermissionRequest({ perm, onRespond }) {
  const btn = (bg) => ({
    padding: '8px 16px', borderRadius: 8, border: 'none',
    background: bg, color: '#111', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  });

  return (
    <div className="msg-in" role="alert" style={{
      background: 'var(--warn-bg)', color: 'var(--warn-ink)', border: '1px solid var(--warn-line)',
      borderRadius: 12, padding: '12px 14px', margin: '10px 0', maxWidth: 'min(540px, 100%)',
    }}>
      <div style={{ fontSize: 13, marginBottom: 8 }}>
        <div style={{ fontWeight: 700 }}>🔐 권한 요청 · {perm.tool}</div>
        {perm.description && <div style={{ marginTop: 2 }}>{perm.description}</div>}
      </div>
      {perm.input_preview && (
        <pre style={{
          margin: '0 0 10px', padding: '8px 10px', borderRadius: 8, maxHeight: 160, overflow: 'auto',
          background: 'oklch(0.2 0.01 60)', color: 'oklch(0.92 0.01 80)',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, lineHeight: 1.5,
          whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        }}>{perm.input_preview}</pre>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onRespond(perm.id, true)} style={btn('var(--ok)')}>허용</button>
        <button onClick={() => onRespond(perm.id, false)} style={btn('var(--danger)')}>거부</button>
      </div>
    </div>
  );
}

// ---- Day divider ----
function DayDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0 10px' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.02em' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
    </div>
  );
}

// ---- Conversation header ----
function useNow(active) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

function ConversationHeader({ channel, onBack, onRemove, onReconnect }) {
  const disconnected = channel.status === 'disconnected';
  const now = useNow(disconnected ? channel.nextRetryAt : null);
  const retryIn = channel.nextRetryAt ? Math.max(0, Math.ceil((channel.nextRetryAt - now) / 1000)) : null;
  const statusText = channel.status === 'connected' ? '연결됨'
    : channel.status === 'connecting' ? '연결 중…'
    : retryIn != null ? `연결 끊김 · ${retryIn}초 후 재시도` : '연결 끊김';
  const statusColor = channel.status === 'connected' ? '#22C55E' : channel.status === 'connecting' ? '#f59e0b' : '#ef4444';
  const iconBtn = {
    width: 36, height: 36, border: 'none', background: 'transparent',
    color: 'var(--ink-3)', cursor: 'pointer', borderRadius: 8, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  return (
    <div className="pad-x" style={{
      paddingTop: 12, paddingBottom: 12, borderBottom: '1px solid var(--line)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      background: 'var(--panel)', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <button onClick={onBack} className="mobile-only focus-ring" title="채널 목록" aria-label="채널 목록" style={{ ...iconBtn, marginLeft: -6 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <ChannelAvatar name={channel.name} color={channel.color} size={36} status={channel.status} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{channel.name}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
            {statusText}
            {disconnected && (
              <button onClick={onReconnect} style={{
                border: 'none', background: 'transparent', padding: 0, marginLeft: 4,
                color: 'var(--ink-2)', textDecoration: 'underline', cursor: 'pointer', fontSize: 12,
              }}>지금 연결</button>
            )}
          </div>
        </div>
      </div>
      <button onClick={onRemove} className="focus-ring" title="채널 삭제" aria-label="채널 삭제" style={iconBtn}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--danger)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-3)'; }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" />
        </svg>
      </button>
    </div>
  );
}

// The socket never opens when Cloudflare Access answers the upgrade with a login redirect
// (the API host has its own Access session). Browsers hide the reason, so after a few
// failed handshakes offer a link that runs the login in a normal tab.
const AUTH_HINT_AFTER = 3;

function AuthHintBanner({ channel }) {
  if (channel.status === 'connected' || (channel.failedAttempts || 0) < AUTH_HINT_AFTER) return null;
  if (!/^https:\/\//.test(channel.httpUrl || '')) return null;
  const loginUrl = channel.httpUrl.replace(/\/+$/, '') + '/health';
  return (
    <div role="status" className="pad-x" style={{
      paddingTop: 8, paddingBottom: 8, fontSize: 12, lineHeight: 1.5,
      background: 'var(--hover)', borderBottom: '1px solid var(--line)', color: 'var(--ink-2)',
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 8px', flexShrink: 0,
    }}>
      <span>연결이 계속 실패해요. 세션이 꺼져 있거나, 서버 쪽 Cloudflare Access 로그인이 만료됐을 수 있어요.</span>
      <a href={loginUrl} target="_blank" rel="noopener noreferrer" className="focus-ring" style={{
        color: 'var(--ink)', fontWeight: 600, textDecoration: 'underline',
      }}>로그인 열기 ↗</a>
      <span style={{ color: 'var(--ink-3)' }}>로그인 후 이 탭으로 돌아오면 바로 다시 연결해요.</span>
    </div>
  );
}

// ---- File chip ----
function FileChip({ file, onRemove }) {
  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'var(--hover)', border: '1px solid var(--line-2)',
      borderRadius: 8, padding: '4px 8px', fontSize: 12, color: 'var(--ink-2)',
    }}>
      {isImage && file._preview && (
        <img src={file._preview} alt="" style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover' }} />
      )}
      <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
      <button onClick={onRemove} style={{
        width: 16, height: 16, border: 'none', background: 'transparent',
        color: 'var(--ink-3)', cursor: 'pointer', padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

// ---- Composer ----
// Touch keyboards have no Shift+Enter: there Enter is a newline and the button sends
const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

function Composer({ onSend, offline, quickPrompts = [] }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [composing, setComposing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const taRef = useRef(null);
  const fileRef = useRef(null);

  useLayoutEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = 'auto';
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 160) + 'px';
    }
  }, [text]);

  const addFiles = (newFiles) => {
    const all = Array.from(newFiles);
    const tooBig = all.filter(f => f.size > window.MAX_UPLOAD_BYTES);
    if (tooBig.length) {
      window.alert(`파일이 너무 큽니다 (최대 ${window.MAX_UPLOAD_BYTES / 1024 / 1024}MB): ${tooBig.map(f => f.name).join(', ')}`);
    }
    const arr = all.filter(f => f.size <= window.MAX_UPLOAD_BYTES).map(f => {
      const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.name);
      if (isImage) f._preview = URL.createObjectURL(f);
      return f;
    });
    setFiles(prev => [...prev, ...arr]);
  };

  const removeFile = (idx) => {
    setFiles(prev => {
      const next = [...prev];
      if (next[idx]._preview) URL.revokeObjectURL(next[idx]._preview);
      next.splice(idx, 1);
      return next;
    });
  };

  const submit = () => {
    const v = text.trim();
    if (!v && files.length === 0) return;
    onSend(v, files);
    setText('');
    // Previews stay alive: the sent bubble shows them until the server URL arrives
    setFiles([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  };

  const hasContent = text.trim() || files.length > 0;

  return (
    <div
      className="composer pad-x"
      style={{
        paddingTop: 14, background: 'var(--panel)',
        borderTop: '1px solid var(--line)', flexShrink: 0,
      }}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Quick prompts: only while the input is empty */}
      {quickPrompts.length > 0 && !text && files.length === 0 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 8, paddingBottom: 2 }}>
          {quickPrompts.map(q => (
            <button key={q.label} onClick={() => onSend(q.text, [])} className="focus-ring" style={{
              flexShrink: 0, padding: '5px 11px', borderRadius: 999,
              border: '1px solid var(--line-2)', background: 'var(--bg)', color: 'var(--ink-2)',
              fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap',
            }}>{q.label}</button>
          ))}
        </div>
      )}
      {/* File chips */}
      {files.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {files.map((f, i) => <FileChip key={i} file={f} onRemove={() => removeFile(i)} />)}
        </div>
      )}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 10,
        background: 'var(--bg)',
        border: dragOver ? '2px dashed var(--accent)' : '1px solid var(--line-2)',
        borderRadius: 14, padding: '8px 10px 8px 14px',
        transition: 'border-color .12s',
      }}
        onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
        onBlur={e => { if (!dragOver) e.currentTarget.style.borderColor = 'var(--line-2)'; }}
      >
        <input ref={fileRef} type="file" multiple style={{ display: 'none' }}
          onChange={e => { if (e.target.files.length > 0) addFiles(e.target.files); }} />
        <button onClick={() => fileRef.current?.click()} title="파일 첨부" aria-label="파일 첨부" style={{
          width: 32, height: 32, border: 'none', background: 'transparent',
          color: 'var(--ink-3)', cursor: 'pointer', borderRadius: 6,
          marginBottom: 1, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
        </button>
        <textarea
          ref={taRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          onKeyDown={e => {
            // nativeEvent.isComposing/229 catch IME Enter even when React state lags (Safari)
            const imeActive = composing || e.nativeEvent.isComposing || e.keyCode === 229;
            if (e.key === 'Enter' && !e.shiftKey && !imeActive && !coarsePointer) {
              e.preventDefault();
              submit();
            }
          }}
          aria-label="메시지"
          placeholder={dragOver ? '여기에 파일을 놓으세요' : offline ? '연결 끊김 — 연결되면 전송됩니다' : '메시지 입력…'}
          rows={1}
          style={{
            flex: 1, border: 'none', outline: 'none',
            background: 'transparent', resize: 'none',
            fontFamily: 'inherit', fontSize: 16, color: 'var(--ink)',
            padding: '6px 0', lineHeight: 1.45,
            minHeight: 22, maxHeight: 160,
          }}
        />
        <button
          onClick={submit}
          disabled={!hasContent}
          title="전송"
          aria-label="전송"
          style={{
            width: 32, height: 32, border: 'none',
            cursor: hasContent ? 'pointer' : 'default',
            background: hasContent ? 'var(--accent)' : 'transparent',
            color: hasContent ? 'var(--accent-ink)' : 'var(--ink-3)',
            borderRadius: 10, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background .12s',
          }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></svg>
        </button>
      </div>
      {!coarsePointer && (
        <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 6, paddingLeft: 4, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.02em' }}>
          Enter 전송 · Shift+Enter 줄바꿈 · 파일 드래그앤드롭
        </div>
      )}
    </div>
  );
}

// ---- Conversation body ----
function Conversation({ channel, onBack, onRemove, onReconnect, onLoadOlder, onSend, onRetry, onPermissionRespond, showTimestamps }) {
  const scrollRef = useRef(null);
  const contentRef = useRef(null);
  // Follow new messages only while the reader is at the bottom
  const stickRef = useRef(true);
  const lastIdRef = useRef(null);
  const last = channel.messages[channel.messages.length - 1];
  const first = channel.messages[0];
  // When older messages are prepended, keep the viewport on what the reader was looking at
  const prependRef = useRef(null);

  const toBottom = () => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  };

  useLayoutEffect(() => {
    const el = scrollRef.current;
    const p = prependRef.current;
    if (el && p && first && p.firstId !== first.id) {
      el.scrollTop = el.scrollHeight - p.fromBottom;
      prependRef.current = null;
    }
  }, [first && first.id]);

  const loadOlder = () => {
    const el = scrollRef.current;
    if (!el || !first) return;
    prependRef.current = { firstId: first.id, fromBottom: el.scrollHeight - el.scrollTop };
    stickRef.current = false;
    onLoadOlder();
  };

  useLayoutEffect(() => {
    // Sending a new message always jumps back down
    if (last && last.id !== lastIdRef.current && last.from === 'user' && last.status === 'pending') stickRef.current = true;
    lastIdRef.current = last ? last.id : null;
    toBottom();
  }, [channel.id, channel.messages.length, channel.isThinking, channel.pendingPermissions.length]);

  // Keyboard opening, composer growing, images loading, edits: stay pinned if we were
  useEffect(() => {
    if (!window.ResizeObserver) return;
    const ro = new ResizeObserver(toBottom);
    if (scrollRef.current) ro.observe(scrollRef.current);
    if (contentRef.current) ro.observe(contentRef.current);
    return () => ro.disconnect();
  }, []);

  const canLoadOlder = channel.hasMore !== false && !!first && channel.status === 'connected';

  const onScroll = () => {
    const el = scrollRef.current;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    // Reaching the top pages in older history (only when the server says there is some)
    if (el.scrollTop < 60 && channel.hasMore === true && !channel.loadingOlder) loadOlder();
  };

  // Group consecutive by sender; insert day dividers
  const groups = useMemo(() => {
    const result = [];
    let lastDay = null;
    channel.messages.forEach((m, i) => {
      const day = formatDay(m.ts);
      if (day !== lastDay) {
        result.push({ kind: 'day', label: day, key: 'd' + i });
        lastDay = day;
      }
      const prev = channel.messages[i - 1];
      const next = channel.messages[i + 1];
      const sameDay = (a, b) => a && formatDay(a.ts) === formatDay(b.ts);
      const nearTime = (a, b) => a && Math.abs(a.ts - b.ts) < 600000; // 10 min
      const groupedWithPrev = prev && prev.from === m.from && sameDay(prev, m) && nearTime(prev, m);
      const groupedWithNext = next && next.from === m.from && sameDay(next, m) && nearTime(next, m);
      result.push({
        kind: 'msg', m, key: 'm' + m.id,
        showTime: !groupedWithNext,
        grouped: groupedWithPrev,
      });
    });
    return result;
  }, [channel.messages]);

  // Permission requests
  const permissions = channel.pendingPermissions || [];

  return (
    <section className="conversation" style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <ConversationHeader channel={channel} onBack={onBack} onRemove={onRemove} onReconnect={onReconnect} />
      <AuthHintBanner channel={channel} />
      <div ref={scrollRef} onScroll={onScroll} className="pad-x" style={{ flex: 1, overflowY: 'auto', paddingTop: 8, paddingBottom: 20 }}>
        <div ref={contentRef}>
        {canLoadOlder && channel.hasMore !== null && (
          <div style={{ textAlign: 'center', margin: '8px 0 4px' }}>
            <button onClick={loadOlder} disabled={channel.loadingOlder} className="focus-ring" style={{
              border: '1px solid var(--line-2)', background: 'var(--panel)', color: 'var(--ink-2)',
              borderRadius: 999, padding: '4px 12px', fontSize: 12, cursor: channel.loadingOlder ? 'default' : 'pointer',
            }}>{channel.loadingOlder ? '불러오는 중…' : '이전 대화 더 보기'}</button>
          </div>
        )}
        {channel.messages.length === 0 && !channel.isThinking && (
          <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, marginTop: 60 }}>
            메시지를 보내 대화를 시작하세요
          </div>
        )}
        {groups.map(g => {
          if (g.kind === 'day') return <DayDivider key={g.key} label={g.label} />;
          const m = g.m;
          const isMe = m.from === 'user';
          return (
            <MessageBubble
              key={g.key}
              msg={m}
              isMe={isMe}
              showTime={showTimestamps && g.showTime}
              grouped={g.grouped}
              httpUrl={channel.httpUrl}
              connected={channel.status === 'connected'}
              onRetry={onRetry}
              onMediaLoad={toBottom}
            />
          );
        })}
        {permissions.map(p => (
          <PermissionRequest key={p.id} perm={p} onRespond={onPermissionRespond} />
        ))}
        {channel.isThinking && (
          <div className="msg-in" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <div style={{
              padding: '10px 14px', borderRadius: 14,
              background: 'var(--bubble-them)', border: '1px solid var(--line)',
              borderBottomLeftRadius: 4,
            }}>
              <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
            </div>
          </div>
        )}
        </div>
      </div>
      <Composer onSend={onSend} offline={channel.status !== 'connected'} quickPrompts={(window.QUICK_PROMPTS || {})[channel.id] || []} />
    </section>
  );
}

// ---- Empty state ----
function EmptyConversation() {
  return (
    <section className="conversation" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center', color: 'var(--ink-3)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
        <div style={{ fontSize: 14 }}>채널을 선택하거나 추가하세요</div>
      </div>
    </section>
  );
}

Object.assign(window, {
  ChannelAvatar, ChannelListItem, AddChannelDialog, Sidebar,
  MessageBubble, MessageStatus, PermissionRequest, DayDivider,
  ConversationHeader, Composer, Conversation, EmptyConversation,
  formatClock, formatDay, formatRelativeTs,
});
