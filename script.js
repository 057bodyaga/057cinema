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

// Функция для шестерёнки: показать/скрыть панель настроек токена
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
    if(token) headers["Authorization"] = `token ${token}`;

    const response = await fetch(`https://api.github.com/repos/${GH_USER}/${GH_REPO}/contents/movies.json`, { headers });
    
    if (!response.ok) {
      if(response.status === 401 || response.status === 403) {
        setMsg("❌ Ошибка: Неверный токен или лимит запросов истек!", "var(--danger)");
      }
      throw new Error();
    }
    
    const data = await response.json(); 
    fileSha = data.sha;
    db = JSON.parse(decodeURIComponent(atob(data.content.replace(/\s/g, '')).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
    
    if(token) setMsg("✅ Подключение успешно! База синхронизирована.", "var(--success)");
    render();
  } catch (e) {
    document.getElementById('grid').innerHTML = '<div class="empty">Не удалось загрузить movies.json. Либо файла нет, либо токен не даёт доступ.</div>';
  }
}

async function commitToGitHub(msg) {
  const token = localStorage.getItem('gh_token');
  if(!token) { alert("Нельзя сохранить! Сначала введите рабочий токен."); return; }
  
  const base64 = btoa(encodeURIComponent(JSON.stringify(db, null, 2)).replace(/%([0-9A-F]{2})/g, (m, p1) => String.fromCharCode('0x' + p1)));
  
  try {
    const res = await fetch(`https://api.github.com/repos/${GH_USER}/${GH_REPO}/contents/movies.json`, {
      method: 'PUT',
      headers: { "Authorization": `token ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg, content: base64, sha: fileSha })
    });
    if (res.ok) { 
      fileSha = (await res.json()).content.sha; 
      render(); 
    } else { 
      alert("GitHub отклонил сохранение. Проверьте права токена!"); 
    }
  } catch {
    alert("Ошибка сети при отправке данных на GitHub.");
  }
}

async function apiSave(m) { db = db.filter(x => x.id !== m.id); db.push(m); await commitToGitHub("Обновление фильма"); }
async function apiDelete(id) { db = db.filter(x => x.id !== id); await commitToGitHub("Удаление фильма"); }

function onSearchInput() { clearTimeout(searchTimer); const q = document.getElementById('searchInput').value.trim(); if (q.length < 2) { hideDropdown(); return; } searchTimer = setTimeout(() => fetchMovies(q), 350); }
async function fetchMovies(q) { try { const data = await (await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=ru-RU`)).json(); showDropdown(data.results?.slice(0, 6) ?? []); } catch { hideDropdown(); } }

function showDropdown(res) {
  const dd = document.getElementById('dropdown'); dd.innerHTML = ''; if (!res.length) { hideDropdown(); return; }
  res.forEach(m => {
    const item = document.createElement('div'); item.className = 'dropdown-item';
    item.innerHTML = `<img src="${m.poster_path ? 'https://image.tmdb.org/t/p/w92'+m.poster_path : 'https://placehold.co/42x62'}"><div><h4>${esc(m.title)}</h4><p>${m.release_date?.substring(0,4) ?? '—'}</p></div>`;
    item.onclick = () => pickMovie(m); dd.appendChild(item);
  });
  dd.classList.remove('hidden');
}
function hideDropdown() { document.getElementById('dropdown').classList.add('hidden'); }

function pickMovie(m) {
  pending = m; hideDropdown(); document.getElementById('searchInput').value = m.title; document.getElementById('configTitle').textContent = `Настройка: "${m.title}"`;
  document.getElementById('selStatus').value = 'watchlist'; document.getElementById('configForm').classList.remove('hidden'); onStatusChange();
}
function onStatusChange() { const isW = document.getElementById('selStatus').value === 'watched'; document.querySelectorAll('.watched-only').forEach(el => el.classList.toggle('hidden', !isW)); if (isW) onCategoryChange(); }
function onCategoryChange() { const c = document.getElementById('selCategory').value; document.getElementById('boyField').classList.toggle('hidden', c === 'girl'); document.getElementById('girlField').classList.toggle('hidden', c === 'boy'); }

function saveMovie() {
  if (!pending) return; const btn = document.getElementById('btnSave'); btn.disabled = true;
  const status = document.getElementById('selStatus').value; const cat = status === 'watched' ? document.getElementById('selCategory').value : 'watchlist';
  apiSave({
    id: pending.id, title: pending.title, overview: pending.overview ?? 'Описания нет.',
    poster: pending._poster || (pending.poster_path ? `https://image.tmdb.org/t/p/w185${pending.poster_path}` : 'https://placehold.co/95x142'),
    year: pending.release_date?.substring(0,4) || pending.year || '—', status, category: cat,
    scoreBoy: (status === 'watched' && cat !== 'girl') ? parseInt(document.getElementById('sliBoy').value) : null,
    scoreGirl: (status === 'watched' && cat !== 'boy') ? parseInt(document.getElementById('sliGirl').value) : null,
    timestamp: Date.now()
  });
  document.getElementById('configForm').classList.add('hidden'); document.getElementById('searchInput').value = ''; pending = null; btn.disabled = false;
}

// Полноценно исправленный обработчик раскрытия описания
function toggleDesc(id) {
  textStates[id] = !textStates[id];
  const el = document.getElementById(`desc-${id}`);
  const btn = document.getElementById(`btn-more-${id}`);
  if (el && btn) {
    if(textStates[id]) { 
      el.classList.remove('truncated'); 
      btn.textContent = "Свернуть описание"; 
    } else { 
      el.classList.add('truncated'); 
      btn.textContent = "Развернуть полностью"; 
    }
  }
}

function editRatings(id) {
  const m = db.find(x => x.id === id); if (!m) return; pending = { id: m.id, title: m.title, overview: m.overview, _poster: m.poster, year: m.year };
  document.getElementById('configTitle').textContent = `Изменить: "${m.title}"`; document.getElementById('selStatus').value = m.status; if(m.status === 'watched') document.getElementById('selCategory').value = m.category;
  document.getElementById('configForm').classList.remove('hidden'); onStatusChange();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function deleteMovie(id) { if(confirm("Удалить этот фильм?")) apiDelete(id); }
function markWatched(id) { const m = db.find(x => x.id === id); if (!m) return; pending = { id: m.id, title: m.title, overview: m.overview, _poster: m.poster, year: m.year }; document.getElementById('selStatus').value = 'watched'; document.getElementById('configForm').classList.remove('hidden'); onStatusChange(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

function switchTab(b, t) { activeTab = t; document.querySelectorAll('.tab').forEach(x => x.classList.remove('active')); b.classList.add('active'); document.getElementById('subTabs').classList.toggle('hidden', t !== 'watched'); render(); }
function switchSub(b, s) { activeSub = s; document.querySelectorAll('.sub-tab').forEach(x => x.classList.remove('active')); b.classList.add('active'); render(); }

function renderSidebar() {
  const sideList = document.getElementById('recentList');
  if (!sideList) return;
  
  let watchedList = db.filter(x => x.status === 'watched').sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));
  
  if(!watchedList.length) {
    sideList.innerHTML = '<div style="font-size:0.8rem;color:var(--muted);text-align:center;margin-top:20px">Нет просмотров</div>';
    return;
  }
  
  sideList.innerHTML = watchedList.slice(0, 5).map(m => {
    let scoresHTML = '';
    if(m.scoreBoy) scoresHTML += `<span class="mini-score">👨 ${m.scoreBoy}</span>`;
    if(m.scoreGirl) scoresHTML += `<span class="mini-score">👩 ${m.scoreGirl}</span>`;
    
    return `
      <div class="recent-item">
        <img src="${esc(m.poster)}">
        <div class="recent-info">
          <div class="recent-title" title="${esc(m.title)}">${esc(m.title)}</div>
          <div class="recent-scores">${scoresHTML}</div>
        </div>
      </div>
    `;
  }).join('');
}

function render() {
  renderSidebar();
  const grid = document.getElementById('grid'); let list = db.filter(x => x.status === activeTab);
  if (activeTab === 'watched' && activeSub !== 'all') list = list.filter(x => x.category === activeSub);
  if (!list.length) { grid.innerHTML = '<div class="empty">Здесь пока пусто 🎬</div>'; return; }
  
  grid.innerHTML = list.map(m => {
    const tags = m.status === 'watched' ? `<span class="tag tag-viewer">${LABELS[m.category] ?? m.category}</span>${m.scoreBoy ? `<span class="tag tag-score">👨 ${m.scoreBoy}/10</span>`:''}${m.scoreGirl ? `<span class="tag tag-score">👩 ${m.scoreGirl}/10</span>`:''}` : '';
    const acts = m.status === 'watchlist' ? `<button class="btn-action btn-watched" onclick="markWatched(${m.id})">Посмотрели!</button><button class="btn-action btn-delete" onclick="deleteMovie(${m.id})">Удалить</button>` : `<button class="btn-action btn-edit" onclick="editRatings(${m.id})">Оценки</button><button class="btn-action btn-delete" onclick="deleteMovie(${m.id})">Удалить</button>`;
    
    let inlineScores = '';
    if (m.status === 'watched') {
      if (m.scoreBoy) inlineScores += ` 🍿 ${m.scoreBoy}/10`;
      if (m.scoreGirl) inlineScores += ` 🍿 ${m.scoreGirl}/10`;
    }

    const isTruncated = !textStates[m.id];
    const needsButton = m.overview && m.overview.length > 200;

    return `
      <article class="card">
        <img class="card-poster" src="${esc(m.poster)}">
        <div class="card-body">
          <div class="card-title-wrap">
            <div class="card-title">${esc(m.title)} <span class="card-scores-inline">${inlineScores}</span></div>
          </div>
          <div class="card-year">${esc(m.year)}</div>
          <div id="desc-${m.id}" class="card-desc ${needsButton && isTruncated ? 'truncated' : ''}">${esc(m.overview)}</div>
          ${needsButton ? `<button id="btn-more-${m.id}" class="btn-more-trigger" onclick="toggleDesc(${m.id})">${isTruncated ? 'Развернуть полностью' : 'Свернуть описание'}</button>` : ''}
          <div class="card-tags">${tags}</div>
        </div>
        <div class="card-actions">${acts}</div>
      </article>
    `;
  }).join('');
}

function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
document.addEventListener('click', e => { if (!e.target.closest('.search-wrap')) hideDropdown(); });

apiGet();
