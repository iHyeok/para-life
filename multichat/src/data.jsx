// Channel configuration — stored in localStorage

const STORAGE_KEY = 'multichat-channels';

const DEFAULT_CHANNELS = [
  {
    id: 'para-life',
    name: 'PARA Life',
    wsUrl: 'wss://api.kyxi.net/ws',
    httpUrl: 'https://api.kyxi.net',
    color: '#60a5fa',
  },
];

function loadChannels() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_CHANNELS;
}

function saveChannels(channels) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(channels));
}

let _msgSeq = 0;
function generateMsgId() {
  return 'u' + Date.now() + '-' + (++_msgSeq);
}

const CHANNEL_COLORS = [
  '#60a5fa', '#4ade80', '#f59e0b', '#c084fc', '#f87171',
  '#2dd4bf', '#a78bfa', '#fb923c', '#38bdf8', '#e879f9',
];

function pickColor(index) {
  return CHANNEL_COLORS[index % CHANNEL_COLORS.length];
}

window.loadChannels = loadChannels;
window.saveChannels = saveChannels;
window.generateMsgId = generateMsgId;
window.pickColor = pickColor;
window.DEFAULT_CHANNELS = DEFAULT_CHANNELS;
