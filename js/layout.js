(() => {
  const page = document.body.dataset.page || 'dashboard';
  const labels = {
    dashboard: ['Tableau de bord', 'index.html'],
    employees: ['Employés', 'employees.html'],
    contracts: ['Contrats et documents', 'contracts.html'],
    leaves: ['Congés', 'leaves.html'],
    salaries: ['Salaires', 'salaries.html'],
    bonuses: ['Primes', 'bonuses.html'],
    advances: ['Avances sur salaire', 'advances.html'],
    notifications: ['Notifications', 'notifications.html']
  };
  const icons = {
    dashboard: 'fa-chart-line',
    employees: 'fa-user-group',
    contracts: 'fa-file-contract',
    leaves: 'fa-calendar-days',
    salaries: 'fa-money-check-dollar',
    bonuses: 'fa-gift',
    advances: 'fa-hand-holding-dollar',
    notifications: 'fa-bell'
  };
  const nav = Object.entries(labels).map(([key, [label, href]]) =>
    `<a class="nav-link${key === page ? ' active' : ''}" href="${href}"${key === page ? ' aria-current="page"' : ''}>
      <i class="ico fa-solid ${icons[key]}" aria-hidden="true"></i>${label}
    </a>`).join('');
  const content = document.querySelector('.content');
  if (!content) return;
  content.id = 'main-content';
  const shell = document.createElement('div');
  shell.innerHTML = `
    <a class="skip-link" href="#main-content">Aller au contenu principal</a>
    <input type="checkbox" id="menu-toggle" class="menu-toggle" aria-hidden="true" tabindex="-1">
    <aside class="sidebar"><div class="brand"><span class="brand-icon"><i class="fa-solid fa-building" aria-hidden="true"></i></span>
      <div><strong>Ontonomia</strong><small>Administrateur</small></div></div>
      <nav class="nav" aria-label="Navigation principale">${nav}</nav>
      <div class="logout"><a href="index.html"><i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>Accueil</a></div>
    </aside>
    <div class="main"><header class="topbar"><label class="burger" for="menu-toggle" tabindex="0" role="button" aria-controls="menu-toggle" aria-label="Afficher ou masquer le menu"><i class="fa-solid fa-bars" aria-hidden="true"></i></label>
      <div class="crumbs"><span class="crumb-parent">Ontonomia</span><i class="fa-solid fa-chevron-right" aria-hidden="true"></i><span class="crumb-current">${labels[page][0]}</span></div>
      <div class="topbar-right"><a class="bell" href="notifications.html" aria-label="Notifications"><i class="fa-regular fa-bell" aria-hidden="true"></i><span class="bell-dot"></span></a>
        <span class="separator"></span><div class="user"><span class="avatar">SA</span><div class="user-text"><strong>Ben Braham Khouloud</strong><small>Administrateur</small></div></div></div>
    </header></div>`;
  const skipLink = shell.children[0];
  const toggle = shell.children[1];
  const sidebar = shell.children[2];
  const main = shell.children[3];
  document.body.insertBefore(skipLink, document.body.firstChild);
  document.body.insertBefore(toggle, document.body.children[1]);
  document.body.insertBefore(sidebar, document.body.children[2]);
  document.body.insertBefore(main, document.body.children[3]);
  main.appendChild(content);

  // Le bouton du menu reste utilisable au clavier sur les petits écrans.
  const burger = document.querySelector('.burger');
  const menuToggle = document.querySelector('#menu-toggle');
  burger.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      menuToggle.checked = !menuToggle.checked;
    }
  });
})();
