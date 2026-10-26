(() => {
  const RH = window.RH;
  const FIN = RH.FIN;
  const KEY = 'rh_mod_v1';
  const CUR = 10; // mois courant (Oct 2026)
  const MF = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const DROIT = { CDI: 30, CDD: 30, Stage: 10 };  // jours de congé par an
  const DUREE = { CDI: 0, CDD: 6, Stage: 3 };      // durée en mois (0 = indéterminée)

  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const day = t => new Date(t).toLocaleDateString('fr-FR');
  const D = s => Date.parse(s);
  const badge = (c, t) => `<span class="badge ${c}">${t}</span>`;

  const SEED = () => ({
    conges: [
      { emp: 1, debut: D('2026-07-14'), jours: 10, fin: D('2026-07-23') },
      { emp: 2, debut: D('2026-08-03'), jours: 5, fin: D('2026-08-07') },
      { emp: 6, debut: D('2026-09-21'), jours: 3, fin: D('2026-09-23') },
    ],
    avances: [
      { id: 1, emp: 1, date: D('2026-08-05'), montant: 600, rembourse: 200, retenue: 100 },
      { id: 2, emp: 4, date: D('2026-09-10'), montant: 300, rembourse: 100, retenue: 100 },
    ],
    primes: [
      { id: 1, emp: 1, motif: 'Objectifs T3', mois: 10, montant: 300 },
      { id: 2, emp: 6, motif: 'Ancienneté', mois: 10, montant: 150 },
      { id: 3, emp: 2, motif: 'Clôture comptable', mois: 9, montant: 200 },
    ],
  });

  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.conges) return s; } catch (e) {}
    return SEED();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(M)); } catch (e) {} }
  let M = load();

  const find = id => RH.state.employees.find(e => e.id === id);
  const name = id => (find(id) ? esc(find(id).nom) : '—');

  // Tableau générique : head = [[libellé, classe?]], rows = cellules HTML, foot = ligne de total
  // Cette fonction construit tous les tableaux pour garder un rendu cohérent.
  function table(sel, head, rows, foot) {
    if (!$(sel)) return;
    const cl = i => (head[i][1] ? ` class="${head[i][1]}"` : '');
    $(sel).innerHTML =
      `<thead><tr>${head.map(h => `<th${h[1] ? ` class="${h[1]}"` : ''}>${h[0]}</th>`).join('')}</tr></thead>` +
      `<tbody>${rows.length
        ? rows.map(r => `<tr>${r.map((c, i) => `<td${cl(i)}>${c}</td>`).join('')}</tr>`).join('')
        : `<tr><td colspan="${head.length}" class="empty">Aucune donnée.</td></tr>`}</tbody>` +
      (foot ? `<tfoot><tr>${foot.map((c, i) => `<td${cl(i)}>${c}</td>`).join('')}</tr></tfoot>` : '');
  }

  // Enregistre automatiquement les congés quand un employé passe « En congé » et revient
  // Source de vérité : le statut des employés (la même que la carte « Congés en cours »).
  // Chaque employé « En congé » a exactement un congé ouvert ; tout autre congé ouvert est clôturé.
  // Synchronise le tableau des congés avec le statut enregistré de chaque employé.
  function sync() {
    const onLeave = new Set(RH.state.employees.filter(e => e.statut === 'En congé').map(e => e.id));
    const seen = new Set();
    M.conges.forEach(c => {
      if (c.fin) return;
      if (onLeave.has(c.emp) && !seen.has(c.emp)) seen.add(c.emp);
      else c.fin = Date.now(); // employé revenu, introuvable ou doublon
    });
    onLeave.forEach(id => {
      if (!seen.has(id)) M.conges.push({ emp: id, debut: Date.now(), jours: 1, fin: null });
    });
    return onLeave.size;
  }

  function fillSelects() {
    const list = RH.state.employees.filter(e => e.statut !== FIN);
    const key = list.map(e => e.id).join();
    if (fillSelects.key === key) return;
    fillSelects.key = key;
    ['#a-emp', '#p-emp'].forEach(s => {
      if (!$(s)) return;
      const v = $(s).value;
      $(s).innerHTML = list.map(e => `<option value="${e.id}">${esc(e.nom)}</option>`).join('');
      if (v) $(s).value = v;
    });
  }

  function render() {
    const nbConges = sync();
    fillSelects();
    const E = RH.state.employees;
    const actifs = E.filter(e => e.statut !== FIN);

    // Contrats
    table('#t-contrats',
      [['Employé'], ['Poste'], ['Type'], ['Début'], ['Fin'], ['Statut']],
      E.map(e => {
        const m = e.mois + DUREE[e.contrat];
        const fin = DUREE[e.contrat] ? `${MF[(m - 1) % 12]} ${2026 + Math.floor((m - 1) / 12)}` : 'Indéterminée';
        return [esc(e.nom), esc(e.poste), esc(e.contrat), `${MF[e.mois - 1]} 2026`, fin,
          e.statut === FIN ? badge('b-fin', 'Terminé') : badge('b-actif', 'Actif')];
      }));

    // Congés
    const pris = id => M.conges.filter(c => c.emp === id).reduce((t, c) => t + c.jours, 0);
    table('#t-conges',
      [['Employé'], ['Début'], ['Durée prévue (j)', 'num'], ['Statut'], ['Solde restant (j)', 'num']],
      M.conges.slice().sort((a, b) => (!!a.fin - !!b.fin) || b.debut - a.debut).map(c => {
        const e = find(c.emp);
        return [name(c.emp), day(c.debut), c.jours,
          c.fin ? badge('b-fin', 'Terminé') : badge('b-conge', 'En cours'),
          e ? Math.max(0, DROIT[e.contrat] - pris(c.emp)) : '—'];
      }));

    if ($('#conges-count')) $('#conges-count').textContent = `${nbConges} employé(s) en congé aujourd'hui`;

    // Salaires (net = salaire + primes du mois − retenue d'avance)
    const prime = id => M.primes.filter(p => p.emp === id && p.mois === CUR).reduce((t, p) => t + p.montant, 0);
    const retenue = id => M.avances.filter(a => a.emp === id)
      .reduce((t, a) => t + Math.min(a.retenue, a.montant - a.rembourse), 0);
    const T = { base: 0, prime: 0, ret: 0, net: 0 };
    const rows = actifs.map(e => {
      const p = prime(e.id), r = retenue(e.id), net = e.salaire + p - r;
      T.base += e.salaire; T.prime += p; T.ret += r; T.net += net;
      return [esc(e.nom), esc(e.poste), esc(e.contrat), fmt(e.salaire), fmt(p), fmt(r), `<strong>${fmt(net)}</strong>`];
    });
    table('#t-salaires',
      [['Employé'], ['Poste'], ['Contrat'], ['Base (DT)', 'num'], ['Primes (DT)', 'num'], ['Retenue avance (DT)', 'num'], ['Net à payer (DT)', 'num']],
      rows, ['Total', '', '', fmt(T.base), fmt(T.prime), fmt(T.ret), fmt(T.net)]);

    // Avances
    table('#t-avances',
      [['Employé'], ['Date'], ['Montant (DT)', 'num'], ['Remboursé (DT)', 'num'], ['Reste (DT)', 'num'], ['Retenue / mois (DT)', 'num'], ['Statut']],
      M.avances.slice().sort((a, b) => b.date - a.date).map(a => {
        const reste = a.montant - a.rembourse;
        return [name(a.emp), day(a.date), fmt(a.montant), fmt(a.rembourse), fmt(reste), fmt(a.retenue),
          reste > 0 ? badge('b-conge', 'En cours') : badge('b-fin', 'Soldée')];
      }));

    // Primes
    table('#t-primes',
      [['Employé'], ['Motif'], ['Mois'], ['Montant (DT)', 'num']],
      M.primes.slice().sort((a, b) => b.mois - a.mois || b.id - a.id)
        .map(p => [name(p.emp), esc(p.motif), `${MF[p.mois - 1]} 2026`, fmt(p.montant)]),
      ['Total du mois', '', '', fmt(M.primes.filter(p => p.mois === CUR).reduce((t, p) => t + p.montant, 0))]);

    table('#t-notifications',
      [['Titre'], ['Description'], ['Date'], ['Statut']],
      RH.state.notifs.map(n => [
        esc(n.title), esc(n.text), day(n.ts),
        badge(n.read ? 'b-fin' : 'b-conge', n.read ? 'Lue' : 'Non lue')
      ]));

    save();
  }

  // Formulaires d'ajout
  if ($('#f-avance')) $('#f-avance').addEventListener('submit', ev => {
    ev.preventDefault();
    const montant = +$('#a-montant').value;
    if (!(montant > 0)) return;
    M.avances.push({ id: Date.now(), emp: +$('#a-emp').value, date: Date.now(), montant, rembourse: 0, retenue: Math.ceil(montant / 3) });
    $('#a-montant').value = '';
    render();
  });
  if ($('#f-prime')) $('#f-prime').addEventListener('submit', ev => {
    ev.preventDefault();
    const montant = +$('#p-montant').value, motif = $('#p-motif').value.trim();
    if (!(montant > 0) || !motif) return;
    M.primes.push({ id: Date.now(), emp: +$('#p-emp').value, motif, mois: CUR, montant });
    $('#p-montant').value = ''; $('#p-motif').value = '';
    render();
  });

  // Export CSV : un bouton par tableau, qui exporte ce qui est affiché (filtres et tri compris)
  const slug = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const cell = t => {
    let v = t.replace(/[\u00a0\u202f]/g, ' ').trim();
    if (/^-?\d[\d ]*(,\d+)?$/.test(v)) v = v.replace(/ /g, '');           // 2 800,00 -> 2800,00
    if (/^[=+@]/.test(v) || /^[\t\r]/.test(v) || /^-(?!\d)/.test(v)) v = "'" + v; // évite l'injection de formules
    return /[";\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  };
  function exportCsv(table, title) {
    const keep = [...table.querySelectorAll('thead th')]
      .map((th, i) => (th.querySelector('.sr-only') ? -1 : i)).filter(i => i >= 0);
    const lines = [...table.querySelectorAll('tr')]
      .filter(tr => !tr.querySelector('.empty'))
      .map(tr => keep.map(i => cell(tr.children[i] ? tr.children[i].textContent : '')).join(';'));
    if (lines.length <= 1) {
      window.alert('Aucun résultat disponible pour l’exportation.');
      return;
    }
    const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }); // BOM pour Excel
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${slug(title)}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  document.querySelectorAll('section.card table').forEach(t => {
    const sec = t.closest('section'), title = sec.querySelector('h2').textContent;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn export';
    b.innerHTML = '<i class="fa-solid fa-file-csv" aria-hidden="true"></i>Exporter CSV';
    b.addEventListener('click', () => exportCsv(t, title));
    sec.prepend(b);
  });

  const cc = document.createElement('p');
  cc.id = 'conges-count';
  cc.className = 'conges-count';
  cc.setAttribute('aria-live', 'polite');
  if ($('#conges h2')) $('#conges h2').after(cc);

  window.addEventListener('rh:render', render);
  window.addEventListener('rh:reset', () => {
    try { localStorage.removeItem(KEY); } catch (e) {}
    M = SEED();
    fillSelects.key = null;
  });
  render();
})();