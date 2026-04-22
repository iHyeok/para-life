const { useState: uS, useEffect: uE, useMemo: uM, useRef: uR, useReducer } = React;

// ---- Reducer ----
function channelReducer(state, action) {
  switch (action.type) {
    case 'INIT': {
      const map = {};
      action.channels.forEach(ch => {
        map[ch.id] = { messages: [], status: 'disconnected', unreadCount: 0, isThinking: false, pendingPermissions: [] };
      });
      return map;
    }
    case 'ADD_CHANNEL':
      return { ...state, [action.id]: { messages: [], status: 'disconnected', unreadCount: 0, isThinking: false, pendingPermissions: [] } };
    case 'REMOVE_CHANNEL': {
      const next = { ...state };
      delete next[action.id];
      return next;
    }
    case 'MESSAGE': {
      const ch = state[action.channelId];
      if (!ch) return state;
      const msg = action.msg;
      // Deduplicate by id
      if (ch.messages.some(m => m.id === msg.id)) return state;
      const isThinking = msg.from === 'assistant' ? false : ch.isThinking;
      const unreadCount = action.isActive ? 0 : ch.unreadCount + (msg.from === 'assistant' ? 1 : 0);
      return {
        ...state,
        [action.channelId]: {
          ...ch,
          messages: [...ch.messages, msg],
          isThinking,
          unreadCount,
        },
      };
    }
    case 'EDIT': {
      const ch = state[action.channelId];
      if (!ch) return state;
      return {
        ...state,
        [action.channelId]: {
          ...ch,
          messages: ch.messages.map(m => m.id === action.msgId ? { ...m, text: action.text + ' (edited)' } : m),
        },
      };
    }
    case 'PERMISSION': {
      const ch = state[action.channelId];
      if (!ch) return state;
      return {
        ...state,
        [action.channelId]: {
          ...ch,
          pendingPermissions: [...ch.pendingPermissions, action.perm],
        },
      };
    }
    case 'PERMISSION_RESPONDED': {
      const ch = state[action.channelId];
      if (!ch) return state;
      return {
        ...state,
        [action.channelId]: {
          ...ch,
          pendingPermissions: ch.pendingPermissions.filter(p => p.id !== action.permId),
        },
      };
    }
    case 'STATUS': {
      const ch = state[action.channelId];
      if (!ch) return state;
      // Clear messages on reconnect to avoid duplicates from history replay
      const messages = action.status === 'connected' ? [] : ch.messages;
      return {
        ...state,
        [action.channelId]: { ...ch, status: action.status, messages, isThinking: false },
      };
    }
    case 'SET_THINKING': {
      const ch = state[action.channelId];
      if (!ch) return state;
      return { ...state, [action.channelId]: { ...ch, isThinking: action.value } };
    }
    case 'RESET_UNREAD': {
      const ch = state[action.channelId];
      if (!ch) return state;
      return { ...state, [action.channelId]: { ...ch, unreadCount: 0 } };
    }
    default:
      return state;
  }
}

function App() {
  const [channels, setChannels] = uS(() => window.loadChannels());
  const [activeId, setActiveId] = uS(() => {
    const saved = localStorage.getItem('multichat-active');
    return saved || (channels[0] ? channels[0].id : null);
  });
  const [tweaks, setTweaks] = uS(() => ({ ...window.__TWEAKS }));
  const [editMode, setEditMode] = uS(false);

  const [channelStates, dispatch] = useReducer(channelReducer, {});
  const managersRef = uR({});

  // Initialize channel states
  uE(() => {
    dispatch({ type: 'INIT', channels });
  }, []);

  // Create/destroy managers when channels change
  uE(() => {
    const managers = managersRef.current;

    // Create managers for new channels
    channels.forEach(ch => {
      if (managers[ch.id]) return;
      const mgr = new window.ChannelManager({
        id: ch.id,
        name: ch.name,
        wsUrl: ch.wsUrl,
        httpUrl: ch.httpUrl,
        onMessage: (chId, data) => {
          dispatch({ type: 'MESSAGE', channelId: chId, msg: data, isActive: chId === activeIdRef.current });
        },
        onEdit: (chId, data) => {
          dispatch({ type: 'EDIT', channelId: chId, msgId: data.id, text: data.text });
        },
        onPermission: (chId, data) => {
          dispatch({ type: 'PERMISSION', channelId: chId, perm: data });
        },
        onStatus: (chId, status) => {
          dispatch({ type: 'STATUS', channelId: chId, status });
        },
      });
      managers[ch.id] = mgr;
      mgr.connect();
    });

    // Remove managers for deleted channels
    Object.keys(managers).forEach(id => {
      if (!channels.find(ch => ch.id === id)) {
        managers[id].disconnect();
        delete managers[id];
      }
    });
  }, [channels]);

  // Keep activeId ref in sync for callbacks
  const activeIdRef = uR(activeId);
  uE(() => { activeIdRef.current = activeId; }, [activeId]);

  // Save activeId
  uE(() => {
    if (activeId) localStorage.setItem('multichat-active', activeId);
  }, [activeId]);

  // Reset unread when switching channels
  uE(() => {
    if (activeId) dispatch({ type: 'RESET_UNREAD', channelId: activeId });
  }, [activeId]);

  // Apply tweaks
  uE(() => {
    document.documentElement.classList.toggle('dark', !!tweaks.dark);
    document.documentElement.style.setProperty('--accent', tweaks.accent);
    document.documentElement.style.setProperty('--accent-ink', window.hexToAccentInk(tweaks.accent));
  }, [tweaks.accent, tweaks.dark]);

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

  // Build enriched channel list for sidebar
  const enrichedChannels = uM(() => {
    return channels.map(ch => {
      const st = channelStates[ch.id] || { messages: [], status: 'disconnected', unreadCount: 0, isThinking: false, pendingPermissions: [] };
      return { ...ch, ...st };
    }).sort((a, b) => {
      const la = a.messages.length ? a.messages[a.messages.length - 1].ts : 0;
      const lb = b.messages.length ? b.messages[b.messages.length - 1].ts : 0;
      return lb - la; // most recent first
    });
  }, [channels, channelStates]);

  const activeChannel = uM(() => {
    return enrichedChannels.find(ch => ch.id === activeId) || null;
  }, [enrichedChannels, activeId]);

  const handleSend = (text, files = []) => {
    if (!activeId) return;
    const mgr = managersRef.current[activeId];
    if (!mgr) return;

    if (files.length === 0) {
      // Text only
      const id = window.generateMsgId();
      mgr.send(id, text);
      dispatch({ type: 'MESSAGE', channelId: activeId, msg: { id, from: 'user', text, ts: Date.now() }, isActive: true });
    } else {
      // Send each file as a separate message (server supports 1 file per message)
      files.forEach((file, i) => {
        const id = window.generateMsgId();
        const msgText = i === 0 ? text : '';
        mgr.uploadFile(id, msgText, file);
        dispatch({
          type: 'MESSAGE', channelId: activeId,
          msg: { id, from: 'user', text: msgText || file.name, ts: Date.now(), file: { url: file._preview || '', name: file.name } },
          isActive: true,
        });
      });
    }
    dispatch({ type: 'SET_THINKING', channelId: activeId, value: true });
  };

  const handlePermissionRespond = (permId, allowed) => {
    if (!activeId) return;
    const mgr = managersRef.current[activeId];
    if (mgr) {
      mgr.respondPermission(permId, allowed);
      dispatch({ type: 'PERMISSION_RESPONDED', channelId: activeId, permId });
    }
  };

  const handleAddChannel = (newCh) => {
    const updated = [...channels, newCh];
    setChannels(updated);
    window.saveChannels(updated);
    dispatch({ type: 'ADD_CHANNEL', id: newCh.id });
    setActiveId(newCh.id);
  };

  const handleRemoveChannel = (chId) => {
    const mgr = managersRef.current[chId];
    if (mgr) mgr.disconnect();
    delete managersRef.current[chId];
    const updated = channels.filter(c => c.id !== chId);
    setChannels(updated);
    window.saveChannels(updated);
    dispatch({ type: 'REMOVE_CHANNEL', id: chId });
    if (activeId === chId) setActiveId(updated.length > 0 ? updated[0].id : null);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        channels={enrichedChannels}
        activeId={activeId}
        onSelect={setActiveId}
        onAdd={handleAddChannel}
        onRemove={handleRemoveChannel}
        density={tweaks.density}
      />
      {activeChannel ? (
        <Conversation
          key={activeChannel.id}
          channel={{ ...activeChannel, onRemove: () => handleRemoveChannel(activeChannel.id) }}
          onSend={handleSend}
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
