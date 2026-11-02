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

// One-tap prompts for the PARA orchestrator channel (CLAUDE.md "자주 하는 작업")
const QUICK_PROMPTS = {
  'para-life': [
    { label: '오늘 브리핑', text: '오늘 브리핑 해줘. 진행 중 프로젝트 상태, 마감 임박 항목, 최근 진행 내역 위주로.' },
    { label: '주간 브리핑', text: '이번 주 주간 브리핑 해줘. 이번 주 진행 내역과 다음 주에 할 일 위주로.' },
    { label: '마감·방치 점검', text: '마감이 임박했거나 오래 업데이트되지 않은 프로젝트를 알려줘.' },
    { label: '진행 기록', text: '오늘 진행한 내용을 기록하고 싶어. 어떤 프로젝트인지 물어봐줘.' },
  ],
};

// Must match MAX_UPLOAD_BYTES in channel/server.ts
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

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
window.MAX_UPLOAD_BYTES = MAX_UPLOAD_BYTES;
window.QUICK_PROMPTS = QUICK_PROMPTS;
