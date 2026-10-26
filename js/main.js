(() => {
  const KEY = 'rh_state_v1';
  const REFRESH_MS = 5000;
  const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct'];
  const FIN = 'Contrat terminé';

  const SEED = () => ({
    employees: [
      { id: 1, nom: 'Chebbi Youssef', poste: 'Développeur', contrat: 'CDI', statut: 'Actif', salaire: 2800, mois: 2 },
      { id: 2, nom: 'Ben Salah Amira', poste: 'Comptable', contrat: 'CDI', statut: 'Actif', salaire: 2400, mois: 3 },
      { id: 3, nom: 'Trabelsi Mehdi', poste: 'Commercial', contrat: 'CDD', statut: FIN, salaire: 1900, mois: 3 },
      { id: 4, nom: 'Gharbi Sarra', poste: 'Designer', contrat: 'CDD', statut: 'Actif', salaire: 2100, mois: 6 },
      { id: 5, nom: 'Jlassi Karim', poste: 'Technicien', contrat: 'Stage', statut: FIN, salaire: 600, mois: 8 },
      { id: 6, nom: 'Mansouri Refka', poste: 'Chargée RH', contrat: 'CDI', statut: 'Actif', salaire: 2600, mois: 8 },
      { id: 7, nom: 'Haddad Ons', poste: 'Assistante', contrat: 'Stage', statut: FIN, salaire: 650, mois: 10 },
    ],
    notifs: [],
    ui: { sort: 'nom', dir: 1, q: '', contrat: '', statut: '' },
    updated: Date.now(),
    paused: false,
  });
  const POOL = [['Zouari Nour', 'Analyste', 'CDI', 2500], ['Dridi Anis', 'Support IT', 'CDD', 1800],
    ['Baccouche Lina', 'Juriste', 'CDI', 3000], ['Ayari Walid', 'Stagiaire', 'Stage', 600]];

  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Lecture protégée : une valeur LocalStorage invalide ne doit jamais bloquer l'application.
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.employees) return s; } catch (e) {}
    return SEED();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  let S = load();
  window.RH = { get state() { return S; }, FIN };
  const isDashboard = !!$('#growthChart');
  const isEmployees = !!$('#tbody');

  function notify(icon, title, text) {
    S.notifs.unshift({ icon, title, text, ts: Date.now(), read: false });
    S.notifs = S.notifs.slice(0, 20);
  }
  function setStatut(e, statut) {
    e.statut = statut;
    if (statut === 'En congé') notify('fa-calendar-xmark', 'Début de congé', `${e.nom} est en congé.`);
    else notify('fa-user-clock', 'Retour de congé', `${e.nom} est de retour de congé.`);
  }

  
  let growth;
  let contracts;
  if (isDashboard && window.Chart) {
    Chart.defaults.font.family = 'Figtree, system-ui, sans-serif';
    Chart.defaults.color = '#9ca3af';
    growth = new Chart($('#growthChart'), {
    type: 'bar',
    data: { labels: MOIS, datasets: [{ label: 'Employés', data: [], borderRadius: 8 }] },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f0e9e3' } }, x: { grid: { display: false } } },
    },
    });
    contracts = new Chart($('#contractChart'), {
    type: 'doughnut',
    data: { labels: ['CDI', 'CDD', 'Stage'], datasets: [{ data: [], backgroundColor: ['#9c3100', '#e8731c', '#ffd6aa'], borderWidth: 0 }] },
    options: { maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom' } } },
    });
  }
  if (isDashboard && !window.Chart) {
    $('#growthChart').insertAdjacentHTML('beforebegin', '<p class="chart-message">Les graphiques sont indisponibles hors connexion.</p>');
    $('#contractChart').insertAdjacentHTML('beforebegin', '<p class="chart-message">Les graphiques sont indisponibles hors connexion.</p>');
  }

  
  function renderStats() {
    if (!$('#s-total')) return;
    const E = S.employees, actifs = E.filter(e => e.statut !== FIN);
    $('#s-total').textContent = E.length;
    $('#s-contrats').textContent = actifs.length;
    $('#s-conges').textContent = E.filter(e => e.statut === 'En congé').length;
    $('#s-masse').textContent = fmt(actifs.reduce((t, e) => t + e.salaire, 0)) + ' DT';
    const moduleState = JSON.parse(localStorage.getItem('rh_mod_v1') || '{"primes":[]}');
    if ($('#s-primes')) $('#s-primes').textContent = fmt((moduleState.primes || []).reduce((t, p) => t + Number(p.montant || 0), 0)) + ' DT';
  }

  function renderCharts() {
    if (!isDashboard) return;
    const cumul = MOIS.map((_, i) => S.employees.filter(e => e.mois <= i + 1).length);
    if (!growth || !contracts) return;
    const ds = growth.data.datasets[0];
    ds.data = cumul;
    ds.backgroundColor = cumul.map((_, i) => (i === cumul.length - 1 ? '#9c3100' : '#ffd6aa'));
    growth.update();
    contracts.data.datasets[0].data = ['CDI', 'CDD', 'Stage'].map(c => S.employees.filter(e => e.contrat === c).length);
    contracts.update();
  }

  function renderTable() {
    if (!isEmployees) return;
    const { sort, dir, q, contrat, statut } = S.ui;
    const needle = q.trim().toLowerCase();
    const rows = S.employees
      .filter(e => (!needle || (e.nom + ' ' + e.poste).toLowerCase().includes(needle))
        && (!contrat || e.contrat === contrat) && (!statut || e.statut === statut))
      .sort((a, b) => {
        const x = a[sort], y = b[sort];
        return dir * (typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'fr'));
      });
    document.querySelectorAll('th[data-key]').forEach(th =>
      th.setAttribute('aria-sort', th.dataset.key === sort ? (dir > 0 ? 'ascending' : 'descending') : 'none'));
    $('#count').textContent = `${rows.length} sur ${S.employees.length} employé(s)`;
    const cls = { 'Actif': 'b-actif', 'En congé': 'b-conge', [FIN]: 'b-fin' };
    $('#tbody').innerHTML = rows.length ? rows.map(e => `
      <tr>
        <td>${esc(e.nom)}</td><td>${esc(e.poste)}</td><td>${esc(e.contrat)}</td>
        <td>${MOIS[e.mois - 1]} 2026</td><td class="num">${fmt(e.salaire)}</td>
        <td><span class="badge ${cls[e.statut]}">${esc(e.statut)}</span></td>
        <td>${e.statut === FIN ? '' : `<button type="button" class="row-act" data-id="${e.id}">${e.statut === 'Actif' ? 'Mettre en congé' : 'Marquer le retour'}</button>`}</td>
      </tr>`).join('') : '<tr><td colspan="7" class="empty">Aucun employé ne correspond aux filtres.</td></tr>';
  }

  function renderNotifs() {
    if (!$('#notif-list')) return;
    const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
    const ago = ts => {
      const m = Math.round((ts - Date.now()) / 60000);
      return Math.abs(m) < 1 ? "à l'instant" : Math.abs(m) < 60 ? rtf.format(m, 'minute') : rtf.format(Math.round(m / 60), 'hour');
    };
    $('#notif-list').innerHTML = S.notifs.length ? S.notifs.map(n => `
      <li class="notif">
        <span class="notif-icon"><i class="fa-solid ${n.icon}" aria-hidden="true"></i></span>
        <div><p class="notif-title">${esc(n.title)}</p><p class="notif-text">${esc(n.text)}</p><p class="notif-time">${ago(n.ts)}</p></div>
      </li>`).join('') : '<li class="empty">Aucune notification.</li>';
    const unread = S.notifs.filter(n => !n.read).length;
    if ($('.bell-dot')) $('.bell-dot').hidden = unread === 0;
    if ($('.bell')) $('.bell').setAttribute('aria-label', unread ? `${unread} notification(s) non lue(s)` : 'Notifications');
  }

  function renderLive() {
    if (!$('#live')) return;
    const t = new Date(S.updated).toLocaleTimeString('fr-FR');
    $('#live-status').textContent = S.paused ? `Actualisation en pause (dernière mise à jour à ${t})`
      : `Actualisation automatique toutes les ${REFRESH_MS / 1000} s, dernière mise à jour à ${t}`;
    $('#live').classList.toggle('paused', S.paused);
    $('#toggle-live').textContent = S.paused ? "Reprendre l'actualisation" : 'Mettre en pause';
  }

  const render = () => { renderStats(); renderCharts(); renderTable(); renderNotifs(); renderLive(); window.dispatchEvent(new Event('rh:render')); };

  
  if (isEmployees) $('#tbody').closest('table').querySelector('thead').addEventListener('click', ev => {
    const th = ev.target.closest('th[data-key]');
    if (!th) return;
    S.ui.dir = S.ui.sort === th.dataset.key ? -S.ui.dir : 1;
    S.ui.sort = th.dataset.key;
    save(); renderTable();
  });
  [['#f-q', 'q'], ['#f-contrat', 'contrat'], ['#f-statut', 'statut']].forEach(([sel, key]) => {
    if ($(sel)) {
      $(sel).value = S.ui[key];
      $(sel).addEventListener('input', ev => { S.ui[key] = ev.target.value; save(); renderTable(); });
    }
  });
  if (isEmployees) $('#tbody').addEventListener('click', ev => {
    const b = ev.target.closest('.row-act');
    if (!b) return;
    const e = S.employees.find(x => x.id === +b.dataset.id);
    setStatut(e, e.statut === 'Actif' ? 'En congé' : 'Actif');
    S.updated = Date.now(); save(); render();
  });
  if ($('#f-employe')) $('#f-employe').addEventListener('submit', ev => {
    ev.preventDefault();
    const nom = $('#e-nom').value.trim();
    const poste = $('#e-poste').value.trim();
    const salaire = Number($('#e-salaire').value);
    if (!nom || !poste || !Number.isFinite(salaire) || salaire < 0) return;
    const id = S.employees.length ? Math.max(...S.employees.map(e => e.id)) + 1 : 1;
    const contrat = $('#e-contrat').value;
    S.employees.push({ id, nom, poste, contrat, statut: 'Actif', salaire, mois: new Date().getMonth() + 1 });
    notify('fa-user-plus', 'Nouvel employé', `${nom} a été ajouté.`);
    S.updated = Date.now();
    ev.target.reset();
    save(); render();
  });
  if ($('#toggle-live')) $('#toggle-live').addEventListener('click', () => { S.paused = !S.paused; save(); renderLive(); });
  if ($('#clear-notifs')) $('#clear-notifs').addEventListener('click', ev => { ev.preventDefault(); S.notifs = []; save(); renderNotifs(); });
  if ($('.bell')) $('.bell').addEventListener('click', () => {
    if ($('#notifications')) $('#notifications').scrollIntoView({ behavior: 'smooth' });
    S.notifs.forEach(n => { n.read = true; });
    save(); renderNotifs();
  });
  if ($('#reset')) $('#reset').addEventListener('click', () => {
    if (!confirm('Réinitialiser toutes les données fictives ?')) return;
    try { localStorage.removeItem(KEY); } catch (e) {}
    S = SEED();
    ['#f-q', '#f-contrat', '#f-statut'].forEach(s => { if ($(s)) $(s).value = ''; });
    render();
  });
  window.dispatchEvent(new Event('rh:reset'));
  render();
  setInterval(() => { if (!S.paused) renderLive(); }, REFRESH_MS);
  setInterval(renderNotifs, 30000);
})();