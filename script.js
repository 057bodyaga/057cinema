const TMDB_KEY = 'af2e801d23d9fad3c709a796331ac8f7';
const LABELS   = { joint: '🍿 Наши', boy: '👨 Бодяга', girl: '👩 Каракумикуи' };
const GH_USER  = '057bodyaga'; 
const GH_REPO  = '057cinema';

let db = []; 
let activeTab = 'watchlist'; 
let activeSub = 'all'; 
let pending = null; 
let searchTimer = null; 
let fileSha = null;
let textStates = {}; // Храним состояние кнопок (развернуто/свернуто)

// Заполняем инпут токена из памяти браузера
document.getElementById('tokenInput').value = localStorage.getItem('gh_token') || '';

// Переключение видимости панели токена по клику на шестерёнку
function toggleTokenPanel() {
  const panel = document.getElementById('tokenPanel');
  if (panel) {
    panel.classList.toggle('hidden');
  }
}

function saveTokenBtn() {
  const val = document.getElementById('tokenInput').value.trim();
  if(val) {
    localStorage.setItem('gh_token', val);
    setMsg("Ключ сохранен в браузере! Переподключение...", "var(--success)");
    apiGet();
  } else {
    localStorage.removeItem('gh_token');
    setMsg("Токен удален. Работа в режиме чтения.", "var(--danger)");
  }
}

function setMsg(txt, color) {
  const el = document.getElementById('statusMsg');
  if (el) {
    el.textContent = txt;
    el.style.color = color;
  }
}

async function apiGet() { 
  const token = localStorage.getItem('gh_token');
  if(!token) {
    setMsg("⚠️ Вы не ввели токен! Добавление работать не будет.", "var(--danger)");
  } else {
    setMsg("✅ Токен установлен. Проверяем связь...", "var(--star)");
  }
  
  try {
    document.getElementById('grid').innerHTML = '<div class="loading">Синхронизация с GitHub...</div>';
    
    const headers = { "Accept": "application/vnd.github.v3+json" };
    if(token) headers["Authorization"] = `token
