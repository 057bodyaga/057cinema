const TMDB_KEY = 'af2e801d23d9fad3c709a796331ac8f7';
const LABELS   = { joint: '🍿 Наши', boy: '👨 Бодяга', girl: '👩 Каракумикуи' };
const GH_USER  = '057bodyaga'; 
const GH_REPO  = '057cinema';

let db = []; activeTab = 'watchlist'; activeSub = 'all'; pending = null; searchTimer = null; fileSha = null;
let textStates = {};

document.getElementById('tokenInput').value = localStorage.getItem('gh_token') || '';

function openTokenModal() { document.getElementById('tokenModal').classList.remove('hidden'); }
function closeTokenModal() { document.getElementById('tokenModal').classList.add('hidden'); }

function saveTokenBtn() {
  const val = document.getElementById('tokenInput').value.trim();
  if(val) {
    localStorage.setItem('gh_token', val);
    closeTokenModal();
    apiGet();
  } else {
    localStorage.removeItem('gh_token');
    updateStatusIndicator(false);
  }
}

function updateStatusIndicator(isSuccess) {
  const icon = document.getElementById('statusIcon');
  if(isSuccess) {
    icon.textContent = "✅";
    icon.style.color = "var(--success)";
  } else {
    icon.textContent = "❌";
    icon.style.color = "var(--danger)";
  }
}

async function apiGet() { 
  const token = localStorage.getItem('gh_token');
  updateStatusIndicator(!!token);
  
  try {
    document.getElementById('grid').innerHTML = '<div style="text-align:center;color:var(--muted)">Загрузка...</div>';
    const headers = { "Accept": "application/vnd.github.v3+json" };
    if(token) headers["Authorization"] = `token ${token}`;

    const response = await fetch(`https://api.github.com/repos/${GH_USER}/${GH_REPO}/contents/movies.json`, { headers });
    if (!response.ok) throw new Error();
    
    const data = await response.json(); 
    fileSha = data.sha;
    db = JSON.parse(decodeURIComponent(atob(data.content.replace(/\s/g, '')).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
    
    if(token) updateStatusIndicator(true);
    render();
  } catch (e) {
    document.getElementById('grid').innerHTML = '<div style="text-align:center;color:var(--danger)">Ошибка синхронизации. Проверьте токен в ⚙️</div>';
  }
}

async function commitToGitHub(msg) {
  const token = localStorage.getItem('gh_token');
  if(!token) { alert("Введите токен через ⚙️!"); return; }
  
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
    } else { alert("GitHub отклонил запись."); }
  } catch { alert("Ошибка сети."); }
}

async function apiSave(m) { db = db.filter(x => x.id !== m.id); db.push(m); await commitToGitHub("Обновление фильма"); }
async function apiDelete(id) { db = db.filter(x => x.id !== id); await commitToGitHub("Удаление фильма"); }

function onSearchInput() { clearTimeout(searchTimer); const q = document.getElementById('searchInput').value.trim(); if (q.length < 2) { hideDropdown(); return; } searchTimer = setTimeout(() => fetchMovies(q), 350); }
async function fetchMovies(q) { try { const data = await (await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=ru-RU`)).json(); showDropdown(data.results?.slice(0, 6) ?? []); } catch { hideDropdown(); } }

function showDropdown(res) {
  const dd = document.getElementById('dropdown'); dd.innerHTML = ''; if (!res.length) { hideDropdown(); return; }
  res.forEach(m => {
    const item = document.createElement('div'); item.style.cssText = "display:flex;gap:10px;padding:8px;cursor:pointer;border-bottom:1px solid #2c224d";
    item.innerHTML = `<img src="${m.poster_path ? 'https://image.tmdb.org/t/p/w92'+m.poster_path : 'https://placehold.co/42x62'}" style="width:30px;height:45px;object-fit:cover;border-radius:4px"><div><div style="font-size:0.9rem">${m.title}</div><div style="font-size:0.8rem;color:var(--muted)">${m.release_date?.substring(0,4) ?? '—'}</div></div>`;
    item.onclick = () => pickMovie(m); dd.appendChild(item);
  });
  dd.classList.remove('hidden');
}
function hideDropdown() { document.getElementById('dropdown').classList.add('hidden'); }

function pickMovie(m) {
  pending = m; hideDropdown(); document.getElementById('searchInput').value = m.title; document.getElementById('configTitle').textContent = `Настройка: "${m.title}"`;
  document.getElementById('selStatus').value = 'watchlist'; document.getElementById('configForm').classList.remove('hidden'); onStatusChange();
}
function onStatusChange() { const isW = document.getElementById('selStatus').value === 'watched'; document.querySelectorAll('.watched-only').forEach(el => el.classList.toggle('hidden', !isW)); }

function saveMovie() {
  if (!pending) return;
  const status = document.getElementById('selStatus').value; 
  const cat = status === 'watched' ? document.getElementById('selCategory').value : 'watchlist';
  apiSave({
    id: pending.id, title: pending.title, overview: pending.overview ?? 'Описания нет.',
    poster: pending._poster || (pending.poster_path ? `https://image.tmdb.org/t/p/w185${pending.poster_path}` : 'https://placehold.co/95x142'),
    year: pending.release_date?.substring(0,4) || pending.year || '—', status, category: cat,
    scoreBoy: status === 'watched' ? parseInt(document.getElementById('sliBoy').value) : null,
    scoreGirl: status === 'watched' ? parseInt(document.getElementById('sliGirl').value) : null,
    timestamp: Date.now()
  });
  document.getElementById('configForm').classList.add('hidden'); document.getElementById('searchInput').value = ''; pending = null;
}

function toggleDesc(id) {
  textStates[id] = !textStates[id];
  const el = document.getElementById(`desc-${id}`);
  const btn = document.getElementById(`btn-more-${id}`);
  if(textStates[id]) { el.classList.remove('truncated'); btn.textContent = "Свернуть"; } 
  else { el.classList.add('truncated'); btn.textContent = "Развернуть полностью"; }
}

function editRatings(id) {
  const m = db.find(x => x.id === id); if (!m) return; pending = { id: m.id, title: m.title, overview: m.overview, _poster: m.poster, year: m.year };
  document.getElementById('configTitle').textContent = `Изменить: "${m.title}"`; document.getElementById('selStatus').value = m.status; if(m.status === 'watched') document.getElementById('selCategory').value = m.category;
  document.getElementById('configForm').classList.remove('hidden'); onStatusChange();
}
function deleteMovie(id) { if(confirm("Удалить фильм?")) apiDelete(id); }
function markWatched(id) { const m = db.find(x => x.id === id); if (!m) return; pending = { id: m.id, title: m.title, overview: m.overview, _poster: m.poster, year: m.year }; document.getElementById('selStatus').value = 'watched'; document.getElementById('configForm').classList.remove('hidden'); onStatusChange(); }

function switchTab(b, t) { activeTab = t; document.querySelectorAll('.tab').forEach(x => x.classList.remove('active')); b.classList.add('active'); render(); }
function switchSub(b, s) { activeSub = s; render(); }

function renderSidebar() {
  const sideList = document.getElementById('recentList');
  let watchedList = db.filter(x => x.status === 'watched').sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));
  
  if(!watchedList.length) {
    sideList.innerHTML = '<div style="font-size:0.8rem;color:var(--muted);text-align:center">Нет просмотров</div>';
    return;
  }
  
  sideList.innerHTML = watchedList.slice(0, 4).map(m => {
    let scoresHTML = '';
    if(m.scoreBoy) scoresHTML += `<span class="mini-score">👨 ${m.scoreBoy}</span>`;
    if(m.scoreGirl) scoresHTML += `<span class="mini-score">👩 ${m.scoreGirl}</span>`;
    
    return `
      <div class="recent-item">
        <img src="${m.poster}">
        <div class="recent-info">
          <div class="recent-title" title="${m.title}">${m.title}</div>
          <div class="recent-scores">${scoresHTML}</div>
        </div>
      </div>
    `;
  }).join('');
}

function render() {
  renderSidebar();
  const grid = document.getElementById('grid'); 
  let list = db.filter(x => x.status === activeTab);
  if (!list.length) { grid.innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted)">Пусто 🎬</div>'; return; }
  
  grid.innerHTML = list.map(m => {
    const tags = m.status === 'watched' ? `<span style="background:rgba(255,255,255,0.05);padding:3px 8px;border-radius:4px;font-size:0.8rem">${LABELS[m.category] || ''}</span>` : '';
    const scores = m.status === 'watched' ? `${m.scoreBoy ? `<span style="color:var(--star);font-size:0.8rem;margin-left:10px">👨 ${m.scoreBoy}/10</span>`:''} ${m.scoreGirl ? `<span style="color:var(--star);font-size:0.8rem;margin-left:10px">👩 ${m.scoreGirl}/10</span>`:''}` : '';
    const acts = m.status === 'watchlist' ? `<button onclick="markWatched(${m.id})" style="padding:6px 12px;background:var(--success);border:none;color:#fff;border-radius:6px;cursor:pointer">Посмотрели!</button> <button onclick="deleteMovie(${m.id})" style="padding:6px 12px;background:none;border:1px solid var(--danger);color:var(--danger);border-radius:6px;cursor:pointer">Удалить</button>` : `<button onclick="editRatings(${m.id})" style="padding:6px 12px;background:none;border:1px solid var(--accent);color:var(--accent);border-radius:6px;cursor:pointer">Оценки</button> <button onclick="deleteMovie(${m.id})" style="padding:6px 12px;background:none;border:1px solid var(--danger);color:var(--danger);border-radius:6px;cursor:pointer">Удалить</button>`;
    
    const isTruncated = !textStates[m.id];
    return `
      <article class="card">
        <img class="card-poster" src="${m.poster}">
        <div class="card-body">
          <div style="display:flex;justify-content:between;align-items:center"><h2 class="card-title">${m.title}</h2>${scores}</div>
          <div class="card-year" style="margin-bottom:8px">${m.year}</div>
          <div id="desc-${m.id}" class="card-desc ${isTruncated ? 'truncated' : ''}">${m.overview}</div>
          ${m.overview && m.overview.length > 140 ? `<button id="btn-more-${m.id}" class="btn-more" onclick="toggleDesc(${m.id})">${isTruncated ? 'Развернуть полностью' : 'Свернуть'}</button>` : ''}
          <div class="card-tags" style="margin-top:10px">${tags}</div>
        </div>
        <div class="card-actions" style="display:flex;flex-direction:column;gap:5px;justify-content:center">${acts}</div>
      </article>
    `;
  }).join('');
}

document.addEventListener('click', e => { if (!e.target.closest('#searchInput')) hideDropdown(); });
apiGet();
