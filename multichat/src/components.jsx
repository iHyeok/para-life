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
      id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
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
        width: 340, background: 'var(--panel)', border: '1px solid var(--line)',
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
function Sidebar({ channels, activeId, onSelect, onAdd, onRemove, density }) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <aside style={{
      width: 340, borderRight: '1px solid var(--line)',
      background: 'var(--panel)', display: 'flex', flexDirection: 'column', flexShrink: 0,
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
          <button onClick={() => setShowAdd(true)} className="focus-ring" title="채널 추가" style={{
            width: 30, height: 30, borderRadius: 8,
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

function MessageBubble({ msg, isMe, showTime, grouped, httpUrl }) {
  const align = isMe ? 'flex-end' : 'flex-start';
  const bubbleStyle = {
    padding: '9px 13px', borderRadius: 14,
    maxWidth: 540, fontSize: 14, lineHeight: 1.45,
    wordBreak: 'break-word', whiteSpace: 'pre-wrap',
  };
  if (isMe) {
    Object.assign(bubbleStyle, {
      background: 'var(--accent)', color: 'var(--accent-ink)',
      borderBottomRightRadius: grouped ? 14 : 4,
    });
  } else {
    Object.assign(bubbleStyle, {
      background: 'var(--bubble-them)', color: 'var(--ink)',
      borderBottomLeftRadius: grouped ? 14 : 4,
      border: '1px solid var(--line)',
    });
  }

  const file = msg.file;
  const fileUrl = file ? (file.url.startsWith('http') ? file.url : (httpUrl || '') + file.url) : null;
  const fileIsImage = file && isImageFile(file.name);

  return (
    <div className="msg-in" style={{ display: 'flex', flexDirection: 'column', alignItems: align, marginTop: grouped ? 3 : 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flexDirection: isMe ? 'row-reverse' : 'row' }}>
        <div style={bubbleStyle}>
          {msg.text && <div>{msg.text}</div>}
          {file && fileIsImage && (
            <a href={fileUrl} target="_blank" rel="noopener" style={{ display: 'block', marginTop: msg.text ? 6 : 0 }}>
              <img src={fileUrl} alt={file.name} style={{
                maxWidth: 300, maxHeight: 240, borderRadius: 8, display: 'block',
              }} />
            </a>
          )}
          {file && !fileIsImage && (
            <a href={fileUrl} download={file.name} target="_blank" rel="noopener" style={{
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
          <div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono, monospace', marginBottom: 2, whiteSpace: 'nowrap' }}>
            {formatClock(msg.ts)}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Permission request ----
function PermissionRequest({ perm, onRespond }) {
  const [responded, setResponded] = useState(false);

  const handle = (allowed) => {
    setResponded(true);
    onRespond(perm.id, allowed);
  };

  return (
    <div className="msg-in" style={{
      background: 'oklch(0.3 0.04 60)', border: '1px solid oklch(0.6 0.15 85)',
      borderRadius: 12, padding: '12px 14px', margin: '10px 0', maxWidth: 540,
    }}>
      <div style={{ fontSize: 13, marginBottom: 8 }}>
        <span style={{ fontWeight: 600 }}>🔐 {perm.tool}</span>
        <span style={{ color: 'var(--ink-2)', marginLeft: 8 }}>{perm.description}</span>
      </div>
      {responded ? (
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>응답 완료</div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => handle(true)} style={{
            padding: '6px 14px', borderRadius: 6, border: 'none',
            background: '#22C55E', color: '#000', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}>Allow</button>
          <button onClick={() => handle(false)} style={{
            padding: '6px 14px', borderRadius: 6, border: 'none',
            background: '#ef4444', color: '#000', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}>Deny</button>
        </div>
      )}
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
function ConversationHeader({ channel, onRemove }) {
  const statusText = channel.status === 'connected' ? '연결됨' : channel.status === 'connecting' ? '연결 중...' : '연결 안됨';
  const statusColor = channel.status === 'connected' ? '#22C55E' : channel.status === 'connecting' ? '#f59e0b' : '#ef4444';

  return (
    <div style={{
      padding: '14px 24px', borderBottom: '1px solid var(--line)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'var(--panel)', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ChannelAvatar name={channel.name} color={channel.color} size={38} status={channel.status} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{channel.name}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
            {statusText}
          </div>
        </div>
      </div>
      <button onClick={onRemove} className="focus-ring" title="채널 제거" style={{
        width: 34, height: 34, border: 'none', background: 'transparent',
        color: 'var(--ink-3)', cursor: 'pointer', borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
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
function Composer({ onSend, disabled }) {
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
    const arr = Array.from(newFiles).map(f => {
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
    files.forEach(f => { if (f._preview) URL.revokeObjectURL(f._preview); });
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
      style={{
        padding: '14px 24px 18px', background: 'var(--panel)',
        borderTop: '1px solid var(--line)', flexShrink: 0,
      }}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
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
        <button onClick={() => fileRef.current?.click()} title="파일 첨부" style={{
          width: 28, height: 28, border: 'none', background: 'transparent',
          color: 'var(--ink-3)', cursor: 'pointer', borderRadius: 6,
          marginBottom: 3, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
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
            if (e.key === 'Enter' && !e.shiftKey && !composing) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={dragOver ? '여기에 파일을 놓으세요' : '메시지 입력…'}
          disabled={disabled}
          rows={1}
          style={{
            flex: 1, border: 'none', outline: 'none',
            background: 'transparent', resize: 'none',
            fontFamily: 'inherit', fontSize: 14, color: 'var(--ink)',
            padding: '6px 0', lineHeight: 1.45,
            minHeight: 22, maxHeight: 160,
          }}
        />
        <button
          onClick={submit}
          disabled={!hasContent}
          title="전송 (Enter)"
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
      <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 6, paddingLeft: 4, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.02em' }}>
        Enter 전송 · Shift+Enter 줄바꿈 · 파일 드래그앤드롭
      </div>
    </div>
  );
}

// ---- Conversation body ----
function Conversation({ channel, onSend, onPermissionRespond, showTimestamps }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [channel.id, channel.messages.length, channel.isThinking]);

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
    <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--bg)' }}>
      <ConversationHeader channel={channel} onRemove={channel.onRemove} />
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 20px' }}>
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
      <Composer onSend={onSend} disabled={channel.status !== 'connected'} />
    </section>
  );
}

// ---- Empty state ----
function EmptyConversation() {
  return (
    <section style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center', color: 'var(--ink-3)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
        <div style={{ fontSize: 14 }}>채널을 선택하거나 추가하세요</div>
      </div>
    </section>
  );
}

Object.assign(window, {
  ChannelAvatar, ChannelListItem, AddChannelDialog, Sidebar,
  MessageBubble, PermissionRequest, DayDivider,
  ConversationHeader, Composer, Conversation, EmptyConversation,
  formatClock, formatDay, formatRelativeTs,
});
