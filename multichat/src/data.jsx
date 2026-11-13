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
  // On-demand project session: `scripts/session.sh start paper` (or ask the PARA Life chat)
  {
    id: 'paper',
    name: 'Paper',
    wsUrl: 'wss://api.kyxi.net/p/paper/ws',
    httpUrl: 'https://api.kyxi.net/p/paper',
    color: '#c084fc',
  },
  // On-demand project session for socratic-museum-guide: `scripts/session.sh start museum`
  {
    id: 'museum',
    name: 'Museum',
    wsUrl: 'wss://api.kyxi.net/p/museum/ws',
    httpUrl: 'https://api.kyxi.net/p/museum',
    color: '#2dd4bf',
  },
];

// Defaults added after a browser saved its list are appended once; a default the user
// deleted stays deleted because its id is remembered here
const SEEN_DEFAULTS_KEY = 'multichat-seen-defaults';

function loadChannels() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return withNewDefaults(parsed);
    }
  } catch {}
  rememberDefaults();
  return DEFAULT_CHANNELS;
}

function rememberDefaults(seen = []) {
  try {
    localStorage.setItem(SEEN_DEFAULTS_KEY, JSON.stringify([...new Set([...seen, ...DEFAULT_CHANNELS.map(c => c.id)])]));
  } catch {}
}

function withNewDefaults(channels) {
  let seen = [];
  try { seen = JSON.parse(localStorage.getItem(SEEN_DEFAULTS_KEY) || '[]'); } catch {}
  // Lists saved before this key existed already went through the original defaults
  if (!Array.isArray(seen) || seen.length === 0) seen = ['para-life'];
  const have = new Set(channels.map(c => c.id));
  const added = DEFAULT_CHANNELS.filter(c => !seen.includes(c.id) && !have.has(c.id));
  rememberDefaults(seen);
  if (added.length === 0) return channels;
  const merged = [...channels, ...added];
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch {}
  return merged;
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
    { label: 'Paper 세션 열기', text: 'paper 세션 열어줘.' },
    { label: 'Museum 세션 열기', text: 'museum 세션 열어줘.' },
  ],
  paper: [
    { label: '지금 어디까지', text: '논문 프로젝트 현재 상태를 정리해줘. Progress Log와 지식 노트 기준으로, 다음에 할 일까지.' },
    { label: '연구 질문 다듬기', text: '지금까지 지식 노트를 바탕으로 연구 질문 후보를 같이 다듬자. 후보마다 근거 노트와 약점도 같이.' },
    { label: '토론 내용 기록', text: '오늘 토론에서 나온 주장·반론·결정을 Progress Log에 정리해줘.' },
  ],
  museum: [
    { label: '지금 어디까지', text: '저장소를 받아서 handoff 최근 항목 기준으로 지금 상태와 다음 할 일을 정리해줘.' },
    { label: '클코 대화 따라잡기', text: '집에서 Claude Code로 나눈 최근 대화를 읽고, handoff에 빠진 진행이나 결정이 있으면 알려줘.' },
    { label: '오늘 작업 기록', text: '오늘 논의하고 정한 것을 handoff와 decisions에 정리하고 커밋해줘.' },
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
