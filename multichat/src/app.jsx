const { useState: uS, useEffect: uE, useMemo: uM, useRef: uR, useReducer } = React;

// No echo from the server within this window → mark the message as failed
const SEND_ACK_TIMEOUT = 20000;

const emptyChannelState = () => ({
  messages: [], status: 'disconnected', nextRetryAt: null, failedAttempts: 0, unreadCount: 0,
  isThinking: false, pendingPermissions: [], echo: false,
  // Older history on the server: true / false / null (unknown, e.g. old server)
  hasMore: null, loadingOlder: false,
  // What the Claude session is doing (server "activity" frames): { state, label, since } or null
  activity: null,
});

// Insert keeping ts order (history replays and echoes can carry older server timestamps)
function insertByTs(messages, msg) {
  const out = [...messages];
  let at = out.length;
  while (at > 0 && out[at - 1].ts > msg.ts) at--;
  out.splice(at, 0, msg);
  return out;
}

function updateChannel(state, id, fn) {
  const ch = state[id];
  if (!ch) return state;
  return { ...state, [id]: { ...ch, ...fn(ch) } };
}

function setMessage(messages, id, fn) {
  return messages.map(m => m.id === id ? { ...m, ...fn(m) } : m);
}

// ---- Reducer ----
function channelReducer(state, action) {
  switch (action.type) {
    case 'INIT': {
      const map = {};
      action.channels.forEach(ch => { map[ch.id] = emptyChannelState(); });
      return map;
    }
    case 'ADD_CHANNEL':
      return { ...state, [action.id]: emptyChannelState() };
    case 'REMOVE_CHANNEL': {
      const next = { ...state };
      delete next[action.id];
      return next;
    }
    case 'MESSAGE':
      return updateChannel(state, action.channelId, ch => {
        const msg = action.msg;
        const existing = ch.messages.find(m => m.id === msg.id);
        // Echo of our own message, or history replay of something we already have
        if (existing) {
          const merged = {
            ...existing, ...msg,
            file: msg.file || existing.file,
            status: msg.from === 'user' ? 'sent' : existing.status,
          };
          return { messages: insertByTs(ch.messages.filter(m => m.id !== msg.id), merged) };
        }
        // The first replay after page load is old news; anything else we haven't seen
        // (including replies that arrived while we were offline) is new
        const isNew = !(action.replay && action.firstConnect);
        const unread = !action.isActive && msg.from === 'assistant' && isNew;
        return {
          messages: insertByTs(ch.messages, msg),
          isThinking: msg.from === 'assistant' ? false : ch.isThinking,
          unreadCount: action.isActive ? 0 : ch.unreadCount + (unread ? 1 : 0),
        };
      });
    case 'SENT':
      // Old servers don't echo: transmission is the best ack we get
      return updateChannel(state, action.channelId, ch => ch.echo ? {} : {
        messages: setMessage(ch.messages, action.msgId, m => ({ status: m.status === 'pending' ? 'sent' : m.status })),
      });
    case 'FAILED':
      return updateChannel(state, action.channelId, ch => {
        const m = ch.messages.find(x => x.id === action.msgId);
        if (!m || m.status !== 'pending') return {};
        return {
          messages: setMessage(ch.messages, action.msgId, () => ({ status: 'failed' })),
          isThinking: false,
        };
      });
    case 'RETRY':
      return updateChannel(state, action.channelId, ch => ({
        messages: setMessage(ch.messages, action.msgId, () => ({ status: 'pending' })),
      }));
    case 'EDIT':
      // Claude may only edit its own replies
      return updateChannel(state, action.channelId, ch => ({
        messages: ch.messages.map(m => m.id === action.msgId && m.from === 'assistant' ? { ...m, text: action.text, edited: true } : m),
      }));
    case 'PERMISSION':
      return updateChannel(state, action.channelId, ch => ({
        // Server replays open requests on reconnect
        pendingPermissions: [...ch.pendingPermissions.filter(p => p.id !== action.perm.id), action.perm],
      }));
    case 'PERMISSION_RESPONDED':
      return updateChannel(state, action.channelId, ch => ({
        pendingPermissions: ch.pendingPermissions.filter(p => p.id !== action.permId),
      }));
    case 'STATUS':
      return updateChannel(state, action.channelId, ch => {
        const connected = action.status === 'connected';
        return {
          status: action.status,
          nextRetryAt: action.nextRetryAt,
          failedAttempts: action.failedAttempts || 0,
          isThinking: false,
          // The server re-sends the current activity after (re)connecting
          activity: null,
          // Messages stay (history replay merges by id); open permissions are re-sent by the server
          ...(connected ? { pendingPermissions: [], echo: false } : {}),
        };
      });
    case 'HISTORY_END':
      return updateChannel(state, action.channelId, ch => ({
        // Only meaningful while nothing older than the replay has been paged in
        hasMore: ch.loadingOlder ? ch.hasMore : action.hasMore ?? null,
      }));
    case 'LOADING_OLDER':
      return updateChannel(state, action.channelId, () => ({ loadingOlder: true }));
    case 'HISTORY_PAGE':
      return updateChannel(state, action.channelId, ch => {
        const have = new Set(ch.messages.map(m => m.id));
        const older = action.messages.filter(m => !have.has(m.id));
        return {
          messages: [...older, ...ch.messages].sort((a, b) => a.ts - b.ts),
          hasMore: action.hasMore,
          loadingOlder: false,
        };
      });
    case 'HELLO':
      return updateChannel(state, action.channelId, () => ({ echo: action.features.includes('echo') }));
    case 'ACTIVITY':
      return updateChannel(state, action.channelId, () => ({
        activity: { state: action.state, label: action.label || '', since: action.since || Date.now() },
      }));
    case 'SET_THINKING':
      return updateChannel(state, action.channelId, () => ({ isThinking: action.value }));
    case 'RESET_UNREAD':
      return updateChannel(state, action.channelId, () => ({ unreadCount: 0 }));
    default:
      return state;
  }
}

function readPref(key) { try { return localStorage.getItem(key); } catch { return null; } }
function writePref(key, value) { try { localStorage.setItem(key, value); } catch {} }

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
const narrow = window.matchMedia('(max-width: 767px)');

function App() {
  const [channels, setChannels] = uS(() => window.loadChannels());
  const [activeId, setActiveId] = uS(() => {
    const saved = localStorage.getItem('multichat-active');
    return channels.some(c => c.id === saved) ? saved : (channels[0] ? channels[0].id : null);
  });
  // Phone layout shows one pane at a time
  const [pane, setPane] = uS(() => (activeId ? 'chat' : 'list'));
  const paneRef = uR(pane);
  uE(() => { paneRef.current = pane; }, [pane]);
  const [tweaks, setTweaks] = uS(() => ({ ...window.__TWEAKS, dark: window.__TWEAKS.dark || prefersDark.matches }));
  const [editMode, setEditMode] = uS(false);

  // Desktop sidebar: collapsible to an avatar rail and resizable; remembered per browser
  const [isNarrow, setIsNarrow] = uS(narrow.matches);
  uE(() => {
    const on = () => setIsNarrow(narrow.matches);
    narrow.addEventListener('change', on);
    return () => narrow.removeEventListener('change', on);
  }, []);
  const [sidebarCollapsed, setSidebarCollapsed] = uS(() => readPref('multichat-sidebar-collapsed') === '1');
  const [sidebarWidth, setSidebarWidth] = uS(() => {
    const w = Number(readPref('multichat-sidebar-width'));
    return w >= 240 && w <= 520 ? w : 340;
  });
  uE(() => { writePref('multichat-sidebar-collapsed', sidebarCollapsed ? '1' : '0'); }, [sidebarCollapsed]);
  uE(() => { writePref('multichat-sidebar-width', String(sidebarWidth)); }, [sidebarWidth]);
  uE(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key === '\\') {
        e.preventDefault();
        setSidebarCollapsed(c => !c);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const [channelStates, dispatch] = useReducer(channelReducer, {});
  const managersRef = uR({});
  // id -> { text, file, timer } so failed messages can be re-sent
  const outgoingRef = uR({});

  // Is this channel's conversation actually on screen?
  const isOnScreen = (chId) =>
    chId === activeIdRef.current && !document.hidden && !(narrow.matches && paneRef.current === 'list');

  const forget = (id) => {
    const out = outgoingRef.current[id];
    if (out) clearTimeout(out.timer);
    delete outgoingRef.current[id];
  };

  const activeIdRef = uR(activeId);
  uE(() => { activeIdRef.current = activeId; }, [activeId]);

  uE(() => {
    dispatch({ type: 'INIT', channels });
  }, []);

  // Create/destroy managers when channels change
  uE(() => {
    const managers = managersRef.current;

    channels.forEach(ch => {
      if (managers[ch.id]) return;
      const mgr = new window.ChannelManager({
        id: ch.id,
        name: ch.name,
        wsUrl: ch.wsUrl,
        httpUrl: ch.httpUrl,
        onMessage: (chId, data, meta) => {
          if (data.from === 'user') {
            const out = outgoingRef.current[data.id];
            // The server copy replaces the local preview
            if (out && out.file && out.file._preview && data.file) URL.revokeObjectURL(out.file._preview);
            forget(data.id);
          }
          dispatch({ type: 'MESSAGE', channelId: chId, msg: data, isActive: isOnScreen(chId), ...meta });
        },
        onEdit: (chId, data) => {
          dispatch({ type: 'EDIT', channelId: chId, msgId: data.id, text: data.text });
        },
        onPermission: (chId, data) => {
          dispatch({ type: 'PERMISSION', channelId: chId, perm: data });
        },
        onPermissionResolved: (chId, data) => {
          dispatch({ type: 'PERMISSION_RESPONDED', channelId: chId, permId: data.id });
        },
        onError: (chId, data) => {
          if (data.id) {
            const out = outgoingRef.current[data.id];
            if (out) clearTimeout(out.timer);
            dispatch({ type: 'FAILED', channelId: chId, msgId: data.id });
          }
          else dispatch({ type: 'SET_THINKING', channelId: chId, value: false });
          window.alert(`[${ch.name}] ${data.message}`);
        },
        onStatus: (chId, status, nextRetryAt, failedAttempts) => {
          dispatch({ type: 'STATUS', channelId: chId, status, nextRetryAt, failedAttempts });
        },
        onHistoryEnd: (chId, data) => {
          dispatch({ type: 'HISTORY_END', channelId: chId, hasMore: data.hasMore });
        },
        onHistoryPage: (chId, data) => {
          dispatch({ type: 'HISTORY_PAGE', channelId: chId, messages: data.messages.map(({ type, ...m }) => m), hasMore: data.hasMore });
        },
        onActivity: (chId, data) => {
          dispatch({ type: 'ACTIVITY', channelId: chId, state: data.state, label: data.label, since: data.since });
        },
        onHello: (chId, data) => {
          dispatch({ type: 'HELLO', channelId: chId, features: data.features || [] });
        },
        onSent: (chId, msgId) => {
          dispatch({ type: 'SENT', channelId: chId, msgId });
          const out = outgoingRef.current[msgId];
          if (!out) return;
          // Old servers don't echo, so the send itself is final
          if (!managersRef.current[chId]?.features.includes('echo')) return forget(msgId);
          clearTimeout(out.timer);
          out.timer = setTimeout(() => dispatch({ type: 'FAILED', channelId: chId, msgId }), SEND_ACK_TIMEOUT);
        },
      });
      managers[ch.id] = mgr;
      mgr.connect();
    });

    Object.keys(managers).forEach(id => {
      if (!channels.find(ch => ch.id === id)) {
        managers[id].disconnect();
        delete managers[id];
      }
    });
  }, [channels]);

  uE(() => {
    if (activeId) localStorage.setItem('multichat-active', activeId);
  }, [activeId]);

  uE(() => {
    if (activeId) dispatch({ type: 'RESET_UNREAD', channelId: activeId });
  }, [activeId]);

  // Back to the tab: what's on screen counts as read
  uE(() => {
    const onVisible = () => {
      if (isOnScreen(activeIdRef.current)) dispatch({ type: 'RESET_UNREAD', channelId: activeIdRef.current });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // Apply tweaks
  uE(() => {
    document.documentElement.classList.toggle('dark', !!tweaks.dark);
    document.documentElement.style.setProperty('--accent', tweaks.accent);
    document.documentElement.style.setProperty('--accent-ink', window.hexToAccentInk(tweaks.accent));
  }, [tweaks.accent, tweaks.dark]);

  // Follow the OS theme unless the page pins dark mode
  uE(() => {
    if (window.__TWEAKS.dark) return;
    const onChange = e => setTweaks(prev => ({ ...prev, dark: e.matches }));
    prefersDark.addEventListener('change', onChange);
    return () => prefersDark.removeEventListener('change', onChange);
  }, []);

  // Edit-mode wiring
  uE(() => {
    const onMsg = e => {
      const d = e.data || {};
      if (d.type === '__activate_edit_mode') setEditMode(true);
      if (d.type === '__deactivate_edit_mode') setEditMode(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const setTweak = (k, v) => {
    setTweaks(prev => {
      const next = { ...prev, [k]: v };
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*');
      return next;
    });
  };

  const enrichedChannels = uM(() => {
    return channels.map(ch => {
      const st = channelStates[ch.id] || emptyChannelState();
      return { ...ch, ...st };
    }).sort((a, b) => {
      // Channels blocked on an approval first, then most recent activity
      const pa = a.pendingPermissions.length > 0, pb = b.pendingPermissions.length > 0;
      if (pa !== pb) return pa ? -1 : 1;
      const la = a.messages.length ? a.messages[a.messages.length - 1].ts : 0;
      const lb = b.messages.length ? b.messages[b.messages.length - 1].ts : 0;
      return lb - la;
    });
  }, [channels, channelStates]);

  const activeChannel = uM(() => {
    return enrichedChannels.find(ch => ch.id === activeId) || null;
  }, [enrichedChannels, activeId]);

  // Tab title surfaces approvals and unread replies while the tab is in the background
  uE(() => {
    const pending = enrichedChannels.reduce((n, ch) => n + ch.pendingPermissions.length, 0);
    const unread = enrichedChannels.reduce((n, ch) => n + ch.unreadCount, 0);
    document.title = pending ? `🔐 승인 대기 ${pending} · Chat` : unread ? `(${unread}) Chat` : 'Chat — 다중채팅시스템';
  }, [enrichedChannels]);

  const transmit = (mgr, id) => {
    const out = outgoingRef.current[id];
    if (!out) return;
    if (out.file) mgr.uploadFile(id, out.text, out.file);
    else mgr.send(id, out.text);
  };

  const handleSend = (text, files = []) => {
    if (!activeId) return;
    const mgr = managersRef.current[activeId];
    if (!mgr) return;

    // One file per message (server limit); text rides on the first one
    const parts = files.length === 0
      ? [{ text, file: null }]
      : files.map((file, i) => ({ text: i === 0 ? text : '', file }));

    parts.forEach(({ text: t, file }) => {
      const id = window.generateMsgId();
      outgoingRef.current[id] = { text: t, file };
      dispatch({
        type: 'MESSAGE', channelId: activeId, isActive: true,
        msg: {
          id, from: 'user', text: t, ts: Date.now(), status: 'pending',
          // Blob preview until the server echo swaps in its /inbox URL
          ...(file ? { file: { url: file._preview || '', name: file.name } } : {}),
        },
      });
      transmit(mgr, id);
    });
    dispatch({ type: 'SET_THINKING', channelId: activeId, value: true });
  };

  const handleRetry = (msgId) => {
    const mgr = managersRef.current[activeId];
    const out = outgoingRef.current[msgId];
    if (!mgr || !out || mgr.hasQueued(msgId)) return;
    clearTimeout(out.timer);
    dispatch({ type: 'RETRY', channelId: activeId, msgId });
    dispatch({ type: 'SET_THINKING', channelId: activeId, value: true });
    transmit(mgr, msgId);
  };

  const handlePermissionRespond = (permId, allowed) => {
    if (!activeId) return;
    const mgr = managersRef.current[activeId];
    if (mgr && mgr.respondPermission(permId, allowed)) {
      dispatch({ type: 'PERMISSION_RESPONDED', channelId: activeId, permId });
    } else {
      window.alert('연결이 끊겨 응답을 보내지 못했습니다. 재연결 후 다시 눌러주세요.');
    }
  };

  const handleLoadOlder = (chId) => {
    const mgr = managersRef.current[chId];
    const ch = channelStates[chId];
    if (!mgr || !ch || ch.loadingOlder || ch.hasMore === false || !ch.messages.length) return;
    if (mgr.requestOlder(ch.messages[0])) dispatch({ type: 'LOADING_OLDER', channelId: chId });
  };

  const handleReconnect = (chId) => {
    const mgr = managersRef.current[chId];
    if (mgr) mgr.reconnect();
  };

  // On phones the chat pane is a history entry, so the back gesture returns to the list
  uE(() => {
    const onPop = (e) => setPane(e.state && e.state.pane === 'chat' ? 'chat' : 'list');
    window.addEventListener('popstate', onPop);
    if (narrow.matches && pane === 'chat') {
      history.replaceState({ pane: 'list' }, '');
      history.pushState({ pane: 'chat' }, '');
    }
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const handleSelect = (chId) => {
    setActiveId(chId);
    dispatch({ type: 'RESET_UNREAD', channelId: chId });
    if (narrow.matches && !(history.state && history.state.pane === 'chat')) history.pushState({ pane: 'chat' }, '');
    setPane('chat');
  };

  const handleBack = () => {
    if (history.state && history.state.pane === 'chat') history.back();
    else setPane('list');
  };

  const handleAddChannel = (newCh) => {
    const updated = [...channels, newCh];
    setChannels(updated);
    window.saveChannels(updated);
    dispatch({ type: 'ADD_CHANNEL', id: newCh.id });
    handleSelect(newCh.id);
  };

  const handleRemoveChannel = (chId) => {
    const ch = channels.find(c => c.id === chId);
    if (!window.confirm(`'${ch ? ch.name : chId}' 채널을 삭제할까요?`)) return;
    const mgr = managersRef.current[chId];
    if (mgr) {
      mgr.outbox.forEach(item => forget(item.id));
      mgr.disconnect();
    }
    delete managersRef.current[chId];
    const updated = channels.filter(c => c.id !== chId);
    setChannels(updated);
    window.saveChannels(updated);
    dispatch({ type: 'REMOVE_CHANNEL', id: chId });
    if (activeId === chId) {
      setActiveId(updated.length > 0 ? updated[0].id : null);
      setPane('list');
    }
  };

  return (
    <div className="app" data-pane={pane}>
      <Sidebar
        channels={enrichedChannels}
        activeId={activeId}
        onSelect={handleSelect}
        onAdd={handleAddChannel}
        density={tweaks.density}
        collapsed={sidebarCollapsed && !isNarrow}
        width={sidebarWidth}
        onToggleCollapse={(v) => setSidebarCollapsed(typeof v === 'boolean' ? v : c => !c)}
        onResize={setSidebarWidth}
      />
      {activeChannel ? (
        <Conversation
          key={activeChannel.id}
          channel={activeChannel}
          onBack={handleBack}
          onRemove={() => handleRemoveChannel(activeChannel.id)}
          onReconnect={() => handleReconnect(activeChannel.id)}
          onLoadOlder={() => handleLoadOlder(activeChannel.id)}
          onSend={handleSend}
          onRetry={handleRetry}
          onPermissionRespond={handlePermissionRespond}
          showTimestamps={tweaks.showTimestamps}
        />
      ) : (
        <EmptyConversation />
      )}
      {editMode && <TweaksPanel tweaks={tweaks} setTweak={setTweak} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
