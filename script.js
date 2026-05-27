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
