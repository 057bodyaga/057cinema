const GH_USER = '057bodyaga'; 
const GH_REPO = '057cinema';
let db = [];

async function apiGet() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '<div class="loading">Синхронизация...</div>';
  try {
    const res = await fetch(`https://api.github.com/repos/${GH_USER}/${GH_REPO}/contents/movies.json`);
    const data = await res.json();
    db = JSON.parse(decodeURIComponent(atob(data.content.replace(/\s/g, ''))));
    render();
  } catch (e) {
    grid.innerHTML = '<div class="loading">Ошибка: проверьте сеть или файл.</div>';
  }
}

function render() {
  const grid = document.getElementById('grid');
  grid.innerHTML = db.map(m => `
    <div class="card">
      <img src="${m.poster}" width="80">
      <div><h3>${m.title}</h3><p>${m.year}</p></div>
    </div>
  `).join('');
}

function toggleTokenPanel() { document.getElementById('tokenPanel').classList.toggle('hidden'); }

apiGet();
