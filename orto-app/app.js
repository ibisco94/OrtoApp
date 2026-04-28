/* ============================================
   ORTO · App logic
   ============================================ */

const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
              'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const MESI_BREVI = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const DOW = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];

const FAMIGLIE = ['Tutte', 'Solanacee', 'Cucurbitacee', 'Composite', 'Leguminose',
                  'Ombrellifere', 'Liliacee', 'Crucifere', 'Chenopodiacee', 'Labiate'];

// ============================================
// STATE & STORAGE
// ============================================

const State = {
  currentView: 'home',
  calendarMonth: new Date().getMonth(),
  calendarYear: new Date().getFullYear(),
  catalogFilter: 'Tutte',
  catalogSearch: '',
  mapTool: 'aiuola',
  mapBeds: [],
  pianteUtente: [],
  installPrompt: null
};

const Storage = {
  load() {
    try {
      const piante = localStorage.getItem('orto_piante');
      const beds = localStorage.getItem('orto_beds');
      State.pianteUtente = piante ? JSON.parse(piante) : [];
      State.mapBeds = beds ? JSON.parse(beds) : [];
    } catch (e) {
      console.error('Storage load failed', e);
    }
  },
  save() {
    try {
      localStorage.setItem('orto_piante', JSON.stringify(State.pianteUtente));
      localStorage.setItem('orto_beds', JSON.stringify(State.mapBeds));
    } catch (e) {
      console.error('Storage save failed', e);
    }
  }
};

// ============================================
// HELPERS
// ============================================

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'data') {
      for (const [dk, dv] of Object.entries(v)) node.dataset[dk] = dv;
    }
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function fmtDate(d) {
  return `${d.getDate()} ${MESI_BREVI[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtDateShort(d) {
  return `${d.getDate()} ${MESI_BREVI[d.getMonth()]}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function stagione(month) {
  if ([12,1,2].includes(month+1)) return 'Inverno';
  if ([3,4,5].includes(month+1)) return 'Primavera';
  if ([6,7,8].includes(month+1)) return 'Estate';
  return 'Autunno';
}

function getOrtaggio(id) {
  return ORTAGGI.find(o => o.id === id);
}

// Calcola le date chiave per una pianta dell'utente
function calcolaDatePianta(pianta) {
  const ortaggio = getOrtaggio(pianta.ortaggioId);
  if (!ortaggio) return {};

  const dataSemina = new Date(pianta.dataSemina);
  let dataTrapianto = null;
  let dataRaccolta = null;

  if (ortaggio.trapianto) {
    dataTrapianto = addDays(dataSemina, ortaggio.trapianto.giorniDopoSemina);
    dataRaccolta = addDays(dataTrapianto, ortaggio.raccolta.giorniDopoTrapianto);
  } else if (ortaggio.raccolta.giorniDopoSemina) {
    dataRaccolta = addDays(dataSemina, ortaggio.raccolta.giorniDopoSemina);
  }

  return { dataSemina, dataTrapianto, dataRaccolta };
}

// Calcola le attività del giorno (entro N giorni)
function attivitaProssime(giorni = 14) {
  const oggi = new Date();
  oggi.setHours(0,0,0,0);
  const limite = addDays(oggi, giorni);
  const eventi = [];

  for (const pianta of State.pianteUtente) {
    const ortaggio = getOrtaggio(pianta.ortaggioId);
    const { dataTrapianto, dataRaccolta } = calcolaDatePianta(pianta);

    if (dataTrapianto && dataTrapianto >= oggi && dataTrapianto <= limite) {
      eventi.push({
        tipo: 'trapianto',
        data: dataTrapianto,
        pianta,
        ortaggio
      });
    }
    if (dataRaccolta && dataRaccolta >= oggi && dataRaccolta <= limite) {
      eventi.push({
        tipo: 'raccolta',
        data: dataRaccolta,
        pianta,
        ortaggio
      });
    }
  }

  // Suggerimenti di semina del mese corrente
  const meseCorrente = oggi.getMonth() + 1;
  for (const ortaggio of ORTAGGI) {
    if (ortaggio.semina.mesi.includes(meseCorrente)) {
      // Vediamo se non c'è già una pianta seminata di recente
      const giàSeminata = State.pianteUtente.some(p =>
        p.ortaggioId === ortaggio.id &&
        new Date(p.dataSemina).getMonth() === oggi.getMonth() &&
        new Date(p.dataSemina).getFullYear() === oggi.getFullYear()
      );
      if (!giàSeminata) {
        eventi.push({
          tipo: 'semina',
          data: oggi,
          ortaggio,
          suggerimento: true
        });
      }
    }
  }

  return eventi.sort((a, b) => a.data - b.data);
}

// ============================================
// VIEWS
// ============================================

function render() {
  const main = $('#main');
  main.innerHTML = '';

  switch (State.currentView) {
    case 'home': renderHome(main); break;
    case 'calendar': renderCalendar(main); break;
    case 'garden': renderGarden(main); break;
    case 'catalog': renderCatalog(main); break;
    case 'map': renderMap(main); break;
  }

  // Update nav active state
  $$('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === State.currentView);
  });
}

// ----- HOME -----
function renderHome(root) {
  const oggi = new Date();
  const eventi = attivitaProssime(14);
  const semine = eventi.filter(e => e.tipo === 'semina' && e.suggerimento).slice(0, 4);
  const trapianti = eventi.filter(e => e.tipo === 'trapianto');
  const raccolte = eventi.filter(e => e.tipo === 'raccolta');

  // Hero
  const hero = el('div', { class: 'hero fade-in' },
    el('div', { class: 'hero-meta' },
      el('span', { class: 'hero-date' }, fmtDate(oggi)),
      el('span', { class: 'hero-dot' }),
      el('span', { class: 'hero-season' }, stagione(oggi.getMonth()))
    ),
    el('h2', { class: 'display' },
      'Cosa fare ',
      el('em', {}, 'oggi'),
      ' nel tuo orto.'
    )
  );
  root.appendChild(hero);

  // Stats
  const stats = el('div', { class: 'summary-grid' },
    el('button', { class: 'stat', onclick: () => switchView('garden') },
      el('div', { class: 'stat-value' }, String(State.pianteUtente.length)),
      el('div', { class: 'stat-label' }, 'PIANTE')
    ),
    el('button', { class: 'stat', onclick: () => switchView('calendar') },
      el('div', { class: 'stat-value' }, String(trapianti.length)),
      el('div', { class: 'stat-label' }, 'TRAPIANTI')
    ),
    el('button', { class: 'stat', onclick: () => switchView('calendar') },
      el('div', { class: 'stat-value' }, String(raccolte.length)),
      el('div', { class: 'stat-label' }, 'RACCOLTE')
    )
  );
  root.appendChild(stats);

  // Prossime attività
  if (trapianti.length > 0 || raccolte.length > 0) {
    const sezione = el('div', { class: 'section' },
      el('h3', { class: 'section-title' }, 'Prossime attività')
    );
    const lista = el('div', { class: 'task-list fade-in-stagger' });
    [...trapianti, ...raccolte].slice(0, 5).forEach(ev => {
      lista.appendChild(taskCard(ev));
    });
    sezione.appendChild(lista);
    root.appendChild(sezione);
  }

  // Suggerimenti semina
  if (semine.length > 0) {
    const sezione = el('div', { class: 'section' },
      el('div', { class: 'section-header' },
        el('h3', { class: 'section-title' }, 'Da seminare ora'),
        el('button', {
          class: 'section-link',
          onclick: () => switchView('catalog')
        }, 'Vedi catalogo →')
      )
    );
    const lista = el('div', { class: 'task-list fade-in-stagger' });
    semine.forEach(ev => {
      lista.appendChild(seminaCard(ev));
    });
    sezione.appendChild(lista);
    root.appendChild(sezione);
  }

  // Empty state se non ha piante e non ci sono semine suggerite
  if (State.pianteUtente.length === 0 && semine.length === 0) {
    root.appendChild(el('div', { class: 'empty fade-in' },
      el('div', { class: 'empty-mark' }, '✿'),
      el('div', { class: 'empty-title' }, 'Il tuo orto è vuoto'),
      el('div', { class: 'empty-text' }, 'Inizia esplorando il catalogo'),
      el('button', {
        class: 'btn-primary',
        onclick: () => switchView('catalog')
      }, 'Vai al catalogo')
    ));
  }
}

function taskCard(ev) {
  const oggi = new Date();
  oggi.setHours(0,0,0,0);
  const giorni = Math.round((ev.data - oggi) / 86400000);
  const sub = giorni === 0 ? 'Oggi' : giorni === 1 ? 'Domani' : `Tra ${giorni} giorni`;
  const tipoLabel = ev.tipo === 'trapianto' ? 'Trapianto' : 'Raccolta';

  return el('button', {
    class: 'task',
    data: { type: ev.tipo },
    onclick: () => openPiantaDetail(ev.pianta.id)
  },
    el('div', { class: 'task-emoji' }, ev.ortaggio.emoji),
    el('div', { class: 'task-body' },
      el('div', { class: 'task-title' }, ev.pianta.nome || ev.ortaggio.nome),
      el('div', { class: 'task-sub' }, `${tipoLabel} · ${sub}`)
    ),
    el('div', { class: 'task-badge' }, fmtDateShort(ev.data))
  );
}

function seminaCard(ev) {
  return el('button', {
    class: 'task',
    onclick: () => openOrtaggioDetail(ev.ortaggio.id)
  },
    el('div', { class: 'task-emoji' }, ev.ortaggio.emoji),
    el('div', { class: 'task-body' },
      el('div', { class: 'task-title' }, ev.ortaggio.nome),
      el('div', { class: 'task-sub' }, ev.ortaggio.semina.tipo)
    ),
    el('div', { class: 'task-badge' }, 'Semina')
  );
}

// ----- CALENDARIO -----
function renderCalendar(root) {
  const m = State.calendarMonth;
  const y = State.calendarYear;
  const oggi = new Date();
  oggi.setHours(0,0,0,0);

  // Header
  const header = el('div', { class: 'month-nav fade-in' },
    el('button', {
      class: 'month-arrow',
      onclick: () => { changeMonth(-1); }
    }, el('span', { html: '←' })),
    el('h2', { class: 'month-title' }, `${MESI[m]} ${y}`),
    el('button', {
      class: 'month-arrow',
      onclick: () => { changeMonth(1); }
    }, el('span', { html: '→' }))
  );
  root.appendChild(header);

  // Legenda
  root.appendChild(el('div', { class: 'legend' },
    el('div', { class: 'legend-item' }, el('span', { class: 'legend-dot' }), 'Semina'),
    el('div', { class: 'legend-item' }, el('span', { class: 'legend-dot trapianto' }), 'Trapianto'),
    el('div', { class: 'legend-item' }, el('span', { class: 'legend-dot raccolta' }), 'Raccolta')
  ));

  // Calcola eventi per ogni giorno del mese
  const primoMese = new Date(y, m, 1);
  const ultimoMese = new Date(y, m+1, 0);
  const giorniMese = ultimoMese.getDate();
  const dowPrimo = (primoMese.getDay() + 6) % 7; // Lun = 0

  const eventiPerGiorno = {};
  for (const pianta of State.pianteUtente) {
    const ortaggio = getOrtaggio(pianta.ortaggioId);
    const { dataSemina, dataTrapianto, dataRaccolta } = calcolaDatePianta(pianta);
    [
      { d: dataSemina, t: 'semina' },
      { d: dataTrapianto, t: 'trapianto' },
      { d: dataRaccolta, t: 'raccolta' }
    ].forEach(({d, t}) => {
      if (d && d.getMonth() === m && d.getFullYear() === y) {
        const giorno = d.getDate();
        if (!eventiPerGiorno[giorno]) eventiPerGiorno[giorno] = new Set();
        eventiPerGiorno[giorno].add(t);
      }
    });
  }

  // Griglia
  const grid = el('div', { class: 'cal-grid' });
  DOW.forEach(d => grid.appendChild(el('div', { class: 'cal-dow' }, d)));

  for (let i = 0; i < dowPrimo; i++) {
    grid.appendChild(el('div', { class: 'cal-day empty' }));
  }
  for (let g = 1; g <= giorniMese; g++) {
    const dataGiorno = new Date(y, m, g);
    const isToday = dataGiorno.getTime() === oggi.getTime();
    const eventi = eventiPerGiorno[g];
    const cls = ['cal-day'];
    if (isToday) cls.push('today');
    if (eventi) cls.push('has-event');

    const day = el('div', {
      class: cls.join(' '),
      onclick: () => eventi && showDayEvents(dataGiorno)
    }, String(g));

    if (eventi) {
      const dots = el('div', { class: 'cal-dots' });
      eventi.forEach(t => dots.appendChild(el('span', { class: `cal-dot ${t}` })));
      day.appendChild(dots);
    }
    grid.appendChild(day);
  }
  root.appendChild(grid);

  // Cosa fare nel mese: ortaggi consigliati
  const meseNumero = m + 1;
  const daSeminare = ORTAGGI.filter(o => o.semina.mesi.includes(meseNumero));
  if (daSeminare.length) {
    root.appendChild(el('h3', { class: 'section-title' }, 'Si può seminare'));
    const grid2 = el('div', { class: 'veg-grid fade-in-stagger' });
    daSeminare.slice(0, 8).forEach(o => grid2.appendChild(vegCard(o)));
    root.appendChild(grid2);
  }
}

function changeMonth(delta) {
  let m = State.calendarMonth + delta;
  let y = State.calendarYear;
  if (m < 0) { m = 11; y -= 1; }
  if (m > 11) { m = 0; y += 1; }
  State.calendarMonth = m;
  State.calendarYear = y;
  render();
}

function showDayEvents(data) {
  const eventiGiorno = [];
  for (const pianta of State.pianteUtente) {
    const ortaggio = getOrtaggio(pianta.ortaggioId);
    const { dataSemina, dataTrapianto, dataRaccolta } = calcolaDatePianta(pianta);
    if (dataSemina && dataSemina.getTime() === data.getTime())
      eventiGiorno.push({ tipo: 'semina', pianta, ortaggio, data });
    if (dataTrapianto && dataTrapianto.getTime() === data.getTime())
      eventiGiorno.push({ tipo: 'trapianto', pianta, ortaggio, data });
    if (dataRaccolta && dataRaccolta.getTime() === data.getTime())
      eventiGiorno.push({ tipo: 'raccolta', pianta, ortaggio, data });
  }

  if (eventiGiorno.length === 0) return;

  const content = el('div', {},
    el('div', { class: 'modal-emoji' }, '📅'),
    el('h3', { class: 'modal-title' }, fmtDate(data)),
    el('p', { class: 'modal-subtitle' }, `${eventiGiorno.length} ${eventiGiorno.length === 1 ? 'attività' : 'attività'}`),
    el('div', { class: 'task-list' },
      ...eventiGiorno.map(ev => {
        const tipo = { semina: 'Semina', trapianto: 'Trapianto', raccolta: 'Raccolta' }[ev.tipo];
        return el('div', { class: 'task', data: { type: ev.tipo } },
          el('div', { class: 'task-emoji' }, ev.ortaggio.emoji),
          el('div', { class: 'task-body' },
            el('div', { class: 'task-title' }, ev.pianta.nome || ev.ortaggio.nome),
            el('div', { class: 'task-sub' }, tipo)
          )
        );
      })
    )
  );
  openModal(content);
}

// ----- LE MIE PIANTE -----
function renderGarden(root) {
  root.appendChild(el('h2', { class: 'display fade-in' },
    'Le mie ', el('em', {}, 'piante'), '.'
  ));

  if (State.pianteUtente.length === 0) {
    root.appendChild(el('div', { class: 'empty fade-in' },
      el('div', { class: 'empty-mark' }, '✿'),
      el('div', { class: 'empty-title' }, 'Nessuna pianta ancora'),
      el('div', { class: 'empty-text' }, 'Aggiungi la prima dal catalogo'),
      el('button', {
        class: 'btn-primary',
        onclick: () => switchView('catalog')
      }, 'Esplora il catalogo')
    ));
    return;
  }

  // Ordina per data semina
  const piante = [...State.pianteUtente].sort(
    (a, b) => new Date(b.dataSemina) - new Date(a.dataSemina)
  );

  const lista = el('div', { class: 'fade-in-stagger', style: 'margin-top:18px' });
  piante.forEach(pianta => lista.appendChild(piantaCard(pianta)));
  root.appendChild(lista);
}

function piantaCard(pianta) {
  const ortaggio = getOrtaggio(pianta.ortaggioId);
  if (!ortaggio) return el('div');

  const oggi = new Date();
  oggi.setHours(0,0,0,0);
  const { dataSemina, dataTrapianto, dataRaccolta } = calcolaDatePianta(pianta);

  // Determina fase corrente
  let faseSemina = 'done';
  let faseTrapianto = 'done';
  let faseRaccolta = 'pending';
  if (dataTrapianto && oggi < dataTrapianto) faseTrapianto = 'pending';
  if (dataTrapianto && oggi < dataTrapianto && oggi >= dataSemina) faseSemina = 'current';
  else if (dataTrapianto && oggi >= dataTrapianto && oggi < dataRaccolta) faseTrapianto = 'current';
  else if (dataRaccolta && oggi >= dataRaccolta) faseRaccolta = 'current';
  if (!dataTrapianto) {
    faseTrapianto = null;
    if (oggi < dataRaccolta) faseSemina = 'current';
    else faseRaccolta = 'current';
  }

  const card = el('div', { class: 'plant-card', onclick: () => openPiantaDetail(pianta.id) },
    el('div', { class: 'plant-head' },
      el('div', { class: 'plant-emoji' }, ortaggio.emoji),
      el('div', { style: 'flex:1; min-width:0' },
        el('h3', { class: 'plant-name' }, pianta.nome || ortaggio.nome),
        el('div', { class: 'plant-meta' }, `Seminata il ${fmtDateShort(dataSemina)}`)
      ),
      el('button', {
        class: 'plant-delete',
        onclick: (e) => { e.stopPropagation(); confirmDelete(pianta.id); }
      }, el('span', { html: '✕' }))
    )
  );

  const tl = el('div', { class: 'timeline' });
  tl.appendChild(timelineItem('Semina', fmtDateShort(dataSemina), faseSemina));
  if (dataTrapianto) {
    tl.appendChild(timelineItem('Trapianto', fmtDateShort(dataTrapianto), faseTrapianto));
  } else {
    tl.appendChild(el('div', { class: 'timeline-item', style: 'opacity:0.4' },
      el('div', { class: 'timeline-label' }, '—'),
      el('div', { class: 'timeline-date' }, '—')
    ));
  }
  tl.appendChild(timelineItem('Raccolta', dataRaccolta ? fmtDateShort(dataRaccolta) : '—', faseRaccolta));
  card.appendChild(tl);

  return card;
}

function timelineItem(label, date, fase) {
  const cls = ['timeline-item'];
  if (fase === 'done') cls.push('done');
  if (fase === 'current') cls.push('current');
  return el('div', { class: cls.join(' ') },
    el('div', { class: 'timeline-label' }, label),
    el('div', { class: 'timeline-date' }, date)
  );
}

function confirmDelete(id) {
  if (confirm('Rimuovere questa pianta?')) {
    State.pianteUtente = State.pianteUtente.filter(p => p.id !== id);
    Storage.save();
    render();
  }
}

// ----- CATALOGO -----
function renderCatalog(root) {
  root.appendChild(el('h2', { class: 'display fade-in' },
    'Catalogo ', el('em', {}, 'ortaggi'), '.'
  ));

  // Search
  const search = el('div', { class: 'search-bar', style: 'margin-top:18px' },
    el('span', { html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3" stroke-linecap="round"/></svg>` }),
    el('input', {
      type: 'text',
      placeholder: 'Cerca un ortaggio...',
      value: State.catalogSearch,
      oninput: (e) => {
        State.catalogSearch = e.target.value;
        updateCatalogList();
      }
    })
  );
  root.appendChild(search);

  // Family filter chips
  const chips = el('div', { class: 'filter-chips' });
  FAMIGLIE.forEach(f => {
    chips.appendChild(el('button', {
      class: 'chip' + (State.catalogFilter === f ? ' active' : ''),
      onclick: () => { State.catalogFilter = f; render(); }
    }, f));
  });
  root.appendChild(chips);

  // Grid
  const grid = el('div', { id: 'catGrid', class: 'veg-grid fade-in-stagger' });
  root.appendChild(grid);
  updateCatalogList();
}

function updateCatalogList() {
  const grid = $('#catGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const q = State.catalogSearch.toLowerCase().trim();
  const filtrati = ORTAGGI.filter(o => {
    if (State.catalogFilter !== 'Tutte' && o.famiglia !== State.catalogFilter) return false;
    if (q && !o.nome.toLowerCase().includes(q)) return false;
    return true;
  });

  if (filtrati.length === 0) {
    grid.appendChild(el('div', { class: 'empty', style: 'grid-column: 1 / -1' },
      el('div', { class: 'empty-text' }, 'Nessun ortaggio trovato')
    ));
    return;
  }

  filtrati.forEach(o => grid.appendChild(vegCard(o)));
}

function vegCard(ortaggio) {
  const haSeminato = State.pianteUtente.some(p => p.ortaggioId === ortaggio.id);
  return el('button', {
    class: 'veg-card',
    onclick: () => openOrtaggioDetail(ortaggio.id)
  },
    haSeminato ? el('span', { class: 'veg-status' }) : null,
    el('span', { class: 'veg-emoji' }, ortaggio.emoji),
    el('h3', { class: 'veg-name' }, ortaggio.nome),
    el('div', { class: 'veg-fam' }, ortaggio.famiglia)
  );
}

function openOrtaggioDetail(id) {
  const o = getOrtaggio(id);
  if (!o) return;

  const meseStrip = (mesiAttivi, classe) => {
    const strip = el('div', { class: 'month-strip' });
    for (let m = 1; m <= 12; m++) {
      const cls = ['month-cell'];
      if (mesiAttivi.includes(m)) {
        cls.push('active');
        if (classe) cls.push(classe);
      }
      strip.appendChild(el('div', { class: cls.join(' ') }, MESI_BREVI[m-1].charAt(0)));
    }
    return strip;
  };

  const trapMesi = o.trapianto ? o.trapianto.mesi : [];
  const raccMesi = o.raccolta.mesi;

  const content = el('div', {},
    el('div', { class: 'modal-emoji' }, o.emoji),
    el('h3', { class: 'modal-title' }, o.nome),
    el('p', { class: 'modal-subtitle' }, o.famiglia.toUpperCase()),

    el('div', { class: 'info-row' },
      el('div', { class: 'info-label' }, 'Semina'),
      el('div', { class: 'info-value' },
        o.semina.tipo,
        meseStrip(o.semina.mesi)
      )
    ),
    o.trapianto ? el('div', { class: 'info-row' },
      el('div', { class: 'info-label' }, 'Trapianto'),
      el('div', { class: 'info-value' },
        `Dopo ${o.trapianto.giorniDopoSemina} giorni`,
        meseStrip(trapMesi, 'trapianto')
      )
    ) : null,
    el('div', { class: 'info-row' },
      el('div', { class: 'info-label' }, 'Raccolta'),
      el('div', { class: 'info-value' },
        o.trapianto
          ? `${o.raccolta.giorniDopoTrapianto} giorni dopo trapianto`
          : `${o.raccolta.giorniDopoSemina} giorni dopo semina`,
        meseStrip(raccMesi, 'raccolta')
      )
    ),
    el('div', { class: 'info-row' },
      el('div', { class: 'info-label' }, 'Profondità'),
      el('div', { class: 'info-value' }, o.semina.profondita)
    ),
    el('div', { class: 'info-row' },
      el('div', { class: 'info-label' }, 'Distanza'),
      el('div', { class: 'info-value' }, o.semina.distanza)
    ),
    el('div', { class: 'info-row' },
      el('div', { class: 'info-label' }, 'Suolo'),
      el('div', { class: 'info-value' }, o.suolo)
    ),
    el('div', { class: 'info-row' },
      el('div', { class: 'info-label' }, 'Annaffiatura'),
      el('div', { class: 'info-value' }, o.annaffiatura)
    ),
    o.consociazioni.length ? el('div', { class: 'info-row' },
      el('div', { class: 'info-label' }, 'Consocia con'),
      el('div', { class: 'info-value' },
        el('div', { class: 'tag-list' },
          ...o.consociazioni.map(c => el('span', { class: 'tag' }, c))
        )
      )
    ) : null,
    o.nemici.length ? el('div', { class: 'info-row' },
      el('div', { class: 'info-label' }, 'Evita con'),
      el('div', { class: 'info-value' },
        el('div', { class: 'tag-list' },
          ...o.nemici.map(c => el('span', { class: 'tag danger' }, c))
        )
      )
    ) : null,
    el('div', { class: 'info-row' },
      el('div', { class: 'info-label' }, 'Note'),
      el('div', { class: 'info-value' }, o.note)
    ),
    el('div', { class: 'action-bar' },
      el('button', {
        class: 'btn-full secondary',
        onclick: closeModal
      }, 'Chiudi'),
      el('button', {
        class: 'btn-full primary',
        onclick: () => openSeminaForm(o.id)
      }, 'Aggiungi al mio orto')
    )
  );

  openModal(content);
}

function openSeminaForm(ortaggioId) {
  const o = getOrtaggio(ortaggioId);
  const oggi = new Date().toISOString().slice(0, 10);

  const content = el('div', {},
    el('div', { class: 'modal-emoji' }, o.emoji),
    el('h3', { class: 'modal-title' }, `Aggiungi ${o.nome}`),
    el('p', { class: 'modal-subtitle' }, 'INSERISCI I DETTAGLI'),

    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Nome (opzionale)'),
      el('input', {
        type: 'text',
        id: 'piantaNome',
        class: 'form-input',
        placeholder: `Es: ${o.nome} San Marzano`
      })
    ),
    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Data di semina'),
      el('input', {
        type: 'date',
        id: 'piantaData',
        class: 'form-input',
        value: oggi
      })
    ),
    el('div', { class: 'action-bar' },
      el('button', {
        class: 'btn-full secondary',
        onclick: () => openOrtaggioDetail(ortaggioId)
      }, 'Indietro'),
      el('button', {
        class: 'btn-full primary',
        onclick: () => salvaPianta(ortaggioId)
      }, 'Salva')
    )
  );

  openModal(content);
  setTimeout(() => $('#piantaNome')?.focus(), 100);
}

function salvaPianta(ortaggioId) {
  const nome = $('#piantaNome').value.trim();
  const dataSemina = $('#piantaData').value;
  if (!dataSemina) {
    alert('Inserisci una data di semina');
    return;
  }
  State.pianteUtente.push({
    id: uid(),
    ortaggioId,
    nome,
    dataSemina,
    createdAt: new Date().toISOString()
  });
  Storage.save();
  closeModal();
  switchView('garden');
}

function openPiantaDetail(piantaId) {
  const pianta = State.pianteUtente.find(p => p.id === piantaId);
  if (pianta) openOrtaggioDetail(pianta.ortaggioId);
}

// ----- MAPPA -----
function renderMap(root) {
  root.appendChild(el('h2', { class: 'display fade-in' },
    'Pianta del ', el('em', {}, 'tuo orto'), '.'
  ));

  root.appendChild(el('p', {
    style: 'color: var(--ink-muted); font-size: 13px; margin: 4px 0 18px'
  }, 'Tocca lo spazio vuoto per aggiungere un\'aiuola. Tocca un\'aiuola per modificarla.'));

  // Toolbar
  const toolbar = el('div', { class: 'map-toolbar' },
    el('button', {
      class: 'map-tool active',
      onclick: () => clearMap()
    }, 'Pulisci tutto'),
    el('button', {
      class: 'map-tool',
      onclick: () => alert(`Hai ${State.mapBeds.length} aiuole nel tuo orto.`)
    }, `${State.mapBeds.length} aiuole`)
  );
  root.appendChild(toolbar);

  // Canvas
  const canvas = el('div', {
    id: 'mapCanvas',
    class: 'map-canvas',
    onclick: (e) => {
      // Solo se ho cliccato direttamente sul canvas
      if (e.target.id !== 'mapCanvas') return;
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      addBed(x, y);
    }
  });
  root.appendChild(canvas);

  // Render aiuole
  State.mapBeds.forEach(bed => canvas.appendChild(bedElement(bed)));

  root.appendChild(el('div', { class: 'map-info' },
    'La mappa ti aiuta a pianificare la rotazione colturale negli anni. Assegna un ortaggio a ogni aiuola per vedere quali colture seguire o evitare nella stessa zona.'
  ));
}

function bedElement(bed) {
  const ortaggio = bed.ortaggioId ? getOrtaggio(bed.ortaggioId) : null;
  return el('div', {
    class: 'bed',
    style: `left:${bed.x}%; top:${bed.y}%; width:${bed.w}%; height:${bed.h}%`,
    onclick: (e) => { e.stopPropagation(); openBedDetail(bed.id); }
  }, ortaggio ? ortaggio.emoji : '🌱');
}

function addBed(x, y) {
  const bed = {
    id: uid(),
    x: Math.max(0, Math.min(75, x - 10)),
    y: Math.max(0, Math.min(75, y - 10)),
    w: 22,
    h: 14,
    ortaggioId: null
  };
  State.mapBeds.push(bed);
  Storage.save();
  render();
}

function openBedDetail(bedId) {
  const bed = State.mapBeds.find(b => b.id === bedId);
  if (!bed) return;

  const select = el('select', { id: 'bedOrtaggio', class: 'form-input' });
  select.appendChild(el('option', { value: '' }, '— Nessuno —'));
  ORTAGGI.forEach(o => {
    const opt = el('option', { value: o.id }, `${o.emoji} ${o.nome}`);
    if (bed.ortaggioId === o.id) opt.selected = true;
    select.appendChild(opt);
  });

  const content = el('div', {},
    el('div', { class: 'modal-emoji' }, '🌱'),
    el('h3', { class: 'modal-title' }, 'Aiuola'),
    el('p', { class: 'modal-subtitle' }, 'CONFIGURA QUESTA ZONA'),

    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Cosa coltivi qui'),
      select
    ),

    el('div', { class: 'action-bar' },
      el('button', {
        class: 'btn-full secondary',
        onclick: () => {
          State.mapBeds = State.mapBeds.filter(b => b.id !== bedId);
          Storage.save();
          closeModal();
          render();
        }
      }, 'Elimina'),
      el('button', {
        class: 'btn-full primary',
        onclick: () => {
          bed.ortaggioId = select.value || null;
          Storage.save();
          closeModal();
          render();
        }
      }, 'Salva')
    )
  );
  openModal(content);
}

function clearMap() {
  if (State.mapBeds.length === 0) return;
  if (confirm('Eliminare tutte le aiuole?')) {
    State.mapBeds = [];
    Storage.save();
    render();
  }
}

// ============================================
// MODAL
// ============================================

function openModal(content) {
  const modal = $('#modal');
  const inner = $('#modalContent');
  inner.innerHTML = '';
  inner.appendChild(content);
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  $('#modal').hidden = true;
  document.body.style.overflow = '';
}

// ============================================
// NAV
// ============================================

function switchView(view) {
  State.currentView = view;
  window.scrollTo({ top: 0, behavior: 'instant' });
  render();
}

// ============================================
// INIT
// ============================================

function init() {
  Storage.load();

  // Nav buttons
  $$('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // Modal close
  $('.modal-backdrop').addEventListener('click', closeModal);

  // Service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // Install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    State.installPrompt = e;
    $('#installBtn').hidden = false;
  });

  $('#installBtn').addEventListener('click', async () => {
    if (State.installPrompt) {
      State.installPrompt.prompt();
      const { outcome } = await State.installPrompt.userChoice;
      if (outcome === 'accepted') {
        $('#installBtn').hidden = true;
      }
      State.installPrompt = null;
    }
  });

  render();
}

document.addEventListener('DOMContentLoaded', init);
