/* ════════════════════════════════════════════════════════════
   PRAGMA · Demo CRM — estado local aislado (sin backend)
   ════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.prototype.slice.call(el.querySelectorAll(s));

  const STORE = 'pragma_crm_v1';
  const TOURKEY = 'pragma_crm_tour_v1';

  const STAGES = [
    { key: 'nuevo', label: 'Nuevo', hex: '#8a94a6' },
    { key: 'contactado', label: 'Contactado', hex: '#2f6fed' },
    { key: 'presupuestado', label: 'Presupuestado', hex: '#d9931f' },
    { key: 'ganado', label: 'Ganado', hex: '#22a559' }
  ];
  const stageIdx = (k) => STAGES.findIndex(s => s.key === k);
  const stageOf = (k) => STAGES[stageIdx(k)] || STAGES[0];

  const AVATAR_COLORS = ['#6b1c1c', '#2f6fed', '#22a559', '#d9931f', '#8a5cf6', '#0ea5e9', '#e0598b', '#0f766e'];
  const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
  const fmt = (n) => money.format(Math.round(n || 0));
  function compact(n) {
    n = +n || 0;
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1).replace('.', ',') + 'M';
    if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return '$' + n;
  }

  /* ───────── seed data ───────── */
  function seed() {
    return {
      clients: [
        { id: uid(), name: 'Martina Rossi', company: 'EMAT Aislaciones', email: 'martina@emat.com.ar', phone: '+54 351 555 0110', value: 1850000, stage: 'presupuestado', createdAt: Date.now() },
        { id: uid(), name: 'Diego Fernández', company: 'Galo Wines', email: 'diego@galowines.com.ar', phone: '+54 351 555 0132', value: 920000, stage: 'contactado', createdAt: Date.now() },
        { id: uid(), name: 'Lucía Gómez', company: 'Greenova', email: 'lucia@greenova.ar', phone: '+54 351 555 0147', value: 2400000, stage: 'ganado', createdAt: Date.now() },
        { id: uid(), name: 'Facundo Martínez', company: 'FM Inmobiliaria', email: 'facu@fminmo.com', phone: '+54 351 555 0163', value: 1300000, stage: 'nuevo', createdAt: Date.now() },
        { id: uid(), name: 'Sofía Quintana', company: 'Quintana Ruiz Asesores', email: 'sofia@qrasesores.com', phone: '+54 351 555 0178', value: 3100000, stage: 'ganado', createdAt: Date.now() },
        { id: uid(), name: 'Tomás Arpeco', company: 'Grupo Arpeco', email: 'tomas@grupoarpeco.com', phone: '+54 351 555 0184', value: 2750000, stage: 'presupuestado', createdAt: Date.now() },
        { id: uid(), name: 'Camila Ruiz', company: 'Viento Sur', email: 'camila@vientosurluz.com', phone: '+54 351 555 0195', value: 680000, stage: 'contactado', createdAt: Date.now() },
        { id: uid(), name: 'Nicolás Paz', company: 'Francisca Nutrición', email: 'nico@franciscanutricion.com', phone: '+54 351 555 0203', value: 540000, stage: 'nuevo', createdAt: Date.now() }
      ],
      // ingresos históricos (5 meses previos); el mes actual se calcula en vivo
      revenueHist: [820000, 1150000, 980000, 1420000, 1680000]
    };
  }

  /* ───────── state ───────── */
  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const p = JSON.parse(raw);
        if (p && Array.isArray(p.clients)) return p;
      }
    } catch (e) { /* ignore */ }
    return seed();
  }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* ignore */ } }

  /* ───────── helpers ───────── */
  function uid() { return 'c' + Math.random().toString(36).slice(2, 9); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
  function initials(name) {
    const p = String(name || '?').trim().split(/\s+/);
    return ((p[0] || '')[0] || '').concat((p[1] || '')[0] || '').toUpperCase() || '?';
  }
  function colorFor(str) {
    let h = 0; str = String(str || '');
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
  }

  /* ───────── KPIs ───────── */
  function computeKpis() {
    const c = state.clients;
    const total = c.length;
    const wonArr = c.filter(x => x.stage === 'ganado');
    const won = wonArr.reduce((a, x) => a + (+x.value || 0), 0);
    const pipeline = c.filter(x => x.stage !== 'ganado').reduce((a, x) => a + (+x.value || 0), 0);
    const conv = total ? Math.round(wonArr.length / total * 100) : 0;
    return { total, won, pipeline, conv, wonCount: wonArr.length };
  }

  /* ───────── render: nav / dashboard ───────── */
  function renderNav() { $('#navClientCount').textContent = state.clients.length; }

  function renderDashboard() {
    const k = computeKpis();
    const cards = [
      { label: 'Clientes', val: String(k.total), sub: 'en la base', ic: iconUsers(), bg: 'rgba(107,28,28,0.08)', fg: 'var(--accent-bordo)' },
      { label: 'Valor en pipeline', val: fmt(k.pipeline), sub: 'oportunidades abiertas', ic: iconTrend(), bg: 'rgba(47,111,237,0.1)', fg: '#2f6fed' },
      { label: 'Ingresos ganados', val: fmt(k.won), sub: `${k.wonCount} cerrados`, ic: iconCheck(), bg: 'rgba(34,165,89,0.12)', fg: '#1f9a52' },
      { label: 'Conversión', val: k.conv + '%', sub: 'ganados / total', ic: iconTarget(), bg: 'rgba(217,147,31,0.12)', fg: '#c07e14' }
    ];
    $('#kpiRow').innerHTML = cards.map(c => `
      <div class="kpi">
        <div class="kpi-top">
          <span class="kpi-label">${c.label}</span>
          <span class="kpi-ic" style="background:${c.bg};color:${c.fg}">${c.ic}</span>
        </div>
        <div class="kpi-val" style="color:${c.fg}">${c.val}</div>
        <div class="kpi-sub">${c.sub}</div>
      </div>`).join('');

    renderBars();
    renderDonut();
    renderRevenue();
  }

  function renderBars() {
    const counts = STAGES.map(s => state.clients.filter(c => c.stage === s.key).length);
    const max = Math.max(1, ...counts);
    $('#chartStages').innerHTML = STAGES.map((s, i) => `
      <div class="bar-row">
        <span class="bar-label">${s.label}</span>
        <span class="bar-track"><span class="bar-fill" style="background:${s.hex}"></span></span>
        <span class="bar-val">${counts[i]}</span>
      </div>`).join('');
    requestAnimationFrame(() => {
      $$('#chartStages .bar-fill').forEach((el, i) => { el.style.width = (counts[i] / max * 100) + '%'; });
    });
  }

  function renderDonut() {
    const vals = STAGES.map(s => state.clients.filter(c => c.stage === s.key).reduce((a, c) => a + (+c.value || 0), 0));
    const total = vals.reduce((a, b) => a + b, 0);
    const r = 58, C = 2 * Math.PI * r, size = 150, cx = size / 2;
    let off = 0, segs = '';
    if (total > 0) {
      STAGES.forEach((s, i) => {
        if (vals[i] <= 0) return;
        const len = vals[i] / total * C;
        segs += `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${s.hex}" stroke-width="20"
          stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" />`;
        off += len;
      });
    } else {
      segs = `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="#e6e1d6" stroke-width="20" />`;
    }
    $('#chartDonut').innerHTML = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <g transform="rotate(-90 ${cx} ${cx})">${segs}</g>
        <text x="${cx}" y="${cx - 4}" text-anchor="middle" style="font:700 1.2rem var(--font-display);fill:var(--text-primary)">${total ? compact(total) : '—'}</text>
        <text x="${cx}" y="${cx + 15}" text-anchor="middle" style="font:500 0.62rem var(--font-mono);fill:var(--text-tertiary)">TOTAL</text>
      </svg>`;
    $('#donutLegend').innerHTML = STAGES.map((s, i) => `
      <li><span class="dot" style="background:${s.hex}"></span>${s.label}<b>${fmt(vals[i])}</b></li>`).join('');
  }

  function renderRevenue() {
    const now = new Date();
    const labels = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', ''));
    }
    const wonNow = computeKpis().won;
    const data = (state.revenueHist || []).slice(0, 5).concat([wonNow]);
    while (data.length < 6) data.unshift(0);

    const W = 640, H = 170, pad = 28, baseY = H - 24;
    const max = Math.max(1, ...data) * 1.15;
    const stepX = (W - pad * 2) / 5;
    const x = i => pad + stepX * i;
    const y = v => pad + (1 - v / max) * (baseY - pad);
    const pts = data.map((v, i) => [x(i), y(v)]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const area = `M${x(0)} ${baseY} ` + pts.map(p => 'L' + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ') + ` L${x(5)} ${baseY} Z`;
    const dots = pts.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${i === 5 ? 4.5 : 3}" fill="${i === 5 ? 'var(--accent-bordo)' : '#fff'}" stroke="var(--accent-bordo)" stroke-width="2"/>`).join('');
    const xlabels = labels.map((l, i) => `<text x="${x(i).toFixed(1)}" y="${H - 6}" text-anchor="middle" style="font:500 0.66rem var(--font-mono);fill:var(--text-tertiary)">${l}</text>`).join('');

    $('#chartRevenue').innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:190px">
        <defs><linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="rgba(107,28,28,0.22)"/><stop offset="1" stop-color="rgba(107,28,28,0)"/>
        </linearGradient></defs>
        <path d="${area}" fill="url(#revG)"/>
        <path d="${line}" fill="none" stroke="var(--accent-bordo)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        ${dots}${xlabels}
      </svg>`;
  }

  /* ───────── render: clientes ───────── */
  function renderClients() {
    const q = ($('#clientSearch').value || '').trim().toLowerCase();
    const list = state.clients
      .filter(c => !q || (c.name + ' ' + c.company + ' ' + c.email).toLowerCase().includes(q))
      .sort((a, b) => b.createdAt - a.createdAt);
    const empty = $('#clientEmpty');
    if (!list.length) { empty.hidden = false; } else { empty.hidden = true; }
    $('#clientRows').innerHTML = list.map(c => {
      const s = stageOf(c.stage);
      return `<tr data-id="${c.id}">
        <td><div class="cell-name">
          <span class="avatar" style="background:${colorFor(c.name)}">${esc(initials(c.name))}</span>
          <span><b>${esc(c.name)}</b><small>${esc(c.email)}</small></span>
        </div></td>
        <td class="col-hide-sm">${esc(c.company)}</td>
        <td class="col-hide-sm">${esc(c.email)}</td>
        <td><span class="stage-badge" style="background:${hexA(s.hex, 0.13)};color:${s.hex}"><span class="dot" style="background:${s.hex}"></span>${s.label}</span></td>
        <td class="td-val">${fmt(c.value)}</td>
      </tr>`;
    }).join('');
  }
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  /* ───────── render: pipeline ───────── */
  function renderPipeline() {
    const k = $('#kanban');
    k.innerHTML = STAGES.map(s => {
      const items = state.clients.filter(c => c.stage === s.key);
      const sum = items.reduce((a, c) => a + (+c.value || 0), 0);
      return `<div class="kcol" data-stage="${s.key}">
        <div class="kcol-head">
          <span class="kcol-dot" style="background:${s.hex}"></span>
          <span class="kcol-title">${s.label}</span>
          <span class="kcol-count">${items.length}</span>
        </div>
        <div class="kcol-sum">${fmt(sum)}</div>
        <div class="kcards" data-stage="${s.key}">
          ${items.map(c => kcard(c)).join('')}
        </div>
      </div>`;
    }).join('');
  }
  function kcard(c) {
    const i = stageIdx(c.stage);
    return `<div class="kcard" draggable="true" data-id="${c.id}">
      <div class="kcard-top">
        <div><div class="kcard-title">${esc(c.company)}</div>
        <div class="kcard-client">${esc(c.name)}</div></div>
      </div>
      <div class="kcard-foot">
        <span class="kcard-val">${fmt(c.value)}</span>
        <span class="kcard-moves">
          <button class="kmove" data-move="-1" ${i === 0 ? 'disabled' : ''} aria-label="Etapa anterior">${chevron('left')}</button>
          <button class="kmove" data-move="1" ${i === STAGES.length - 1 ? 'disabled' : ''} aria-label="Etapa siguiente">${chevron('right')}</button>
        </span>
      </div>
    </div>`;
  }

  function moveClient(id, toStage) {
    const c = state.clients.find(x => x.id === id);
    if (!c || c.stage === toStage) return;
    c.stage = toStage;
    save();
    renderDashboard(); renderPipeline(); renderClients();
    toast(`Movido a “${stageOf(toStage).label}”`);
  }

  /* ───────── modal (alta / detalle editable) ───────── */
  const backdrop = $('#modalBackdrop');
  function openModal() { backdrop.hidden = false; }
  function closeModal() { backdrop.hidden = true; $('#modalBody').innerHTML = ''; }

  function openClientForm(client) {
    const editing = !!client;
    $('#modalTitle').textContent = editing ? 'Editar cliente' : 'Nuevo cliente';
    const c = client || { name: '', company: '', email: '', phone: '', value: '', stage: 'nuevo' };
    $('#modalBody').innerHTML = `
      <form id="clientForm" novalidate>
        <div class="field">
          <label>Nombre de contacto *</label>
          <input name="name" value="${esc(c.name)}" placeholder="Ej: Juan Pérez" autocomplete="off">
        </div>
        <div class="field">
          <label>Empresa</label>
          <input name="company" value="${esc(c.company)}" placeholder="Ej: Acme S.A." autocomplete="off">
        </div>
        <div class="field-row">
          <div class="field"><label>Email</label><input name="email" value="${esc(c.email)}" placeholder="correo@empresa.com" autocomplete="off"></div>
          <div class="field"><label>Teléfono</label><input name="phone" value="${esc(c.phone)}" placeholder="+54 …" autocomplete="off"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Valor estimado (ARS)</label><input name="value" type="number" min="0" step="10000" value="${c.value}" placeholder="0"></div>
          <div class="field"><label>Etapa</label><select name="stage">
            ${STAGES.map(s => `<option value="${s.key}" ${s.key === c.stage ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select></div>
        </div>
        <div class="err" id="formErr">Ingresá al menos el nombre de contacto.</div>
        <div class="modal-foot">
          ${editing ? '<button type="button" class="btn-ghost" id="delBtn">Eliminar</button>' : ''}
          <button type="submit" class="btn-accent">${editing ? 'Guardar cambios' : 'Crear cliente'}</button>
        </div>
      </form>`;
    openModal();
    const form = $('#clientForm');
    setTimeout(() => form.name.focus(), 60);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {
        name: form.name.value.trim(), company: form.company.value.trim(),
        email: form.email.value.trim(), phone: form.phone.value.trim(),
        value: +form.value.value || 0, stage: form.stage.value
      };
      if (!data.name) { $('#formErr').classList.add('show'); return; }
      if (editing) {
        Object.assign(client, data);
        toast('Cliente actualizado');
      } else {
        state.clients.push(Object.assign({ id: uid(), createdAt: Date.now() }, data));
        toast('Cliente agregado');
      }
      save(); closeModal();
      renderNav(); renderDashboard(); renderClients(); renderPipeline();
    });
    const del = $('#delBtn');
    if (del) del.addEventListener('click', () => {
      state.clients = state.clients.filter(x => x.id !== client.id);
      save(); closeModal();
      renderNav(); renderDashboard(); renderClients(); renderPipeline();
      toast('Cliente eliminado');
    });
  }

  /* ───────── view switching ───────── */
  const TITLES = { dashboard: 'Dashboard', clientes: 'Clientes', pipeline: 'Pipeline' };
  function setView(v) {
    $$('.view').forEach(s => s.classList.toggle('active', s.dataset.view === v));
    $$('.side-link').forEach(b => b.classList.toggle('active', b.dataset.view === v));
    $('#viewTitle').textContent = TITLES[v] || 'Dashboard';
    $('#crm').classList.remove('nav-open');
    $('.crm-content').scrollTop = 0;
  }

  /* ───────── toast ───────── */
  let toastT;
  function toast(msg) {
    const t = $('#toast');
    t.innerHTML = `<span class="tdot"></span>${esc(msg)}`;
    t.hidden = false;
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(toastT);
    toastT = setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.hidden = true, 300); }, 2400);
  }

  /* ───────── tour ───────── */
  const TOUR = [
    { sel: '.top-title', title: 'Bienvenido a la demo', text: 'Este es un mini CRM 100% funcional. Todos los datos son ficticios y viven solo en tu navegador: probá sin miedo.' },
    { sel: '#kpiRow', title: 'Indicadores en vivo', text: 'Los KPIs se recalculan automáticamente con cada acción que hacés en el sistema.' },
    { sel: '#chartStages', title: 'Gráficos dinámicos', text: 'El dashboard refleja el estado real de tu pipeline en tiempo real.' },
    { sel: '[data-view="pipeline"]', title: 'Pipeline Kanban', text: 'Arrastrá oportunidades entre etapas. En mobile usá las flechas de cada tarjeta.' },
    { sel: '.side-cta', title: '¿Te gusta?', text: 'Pedinos un sistema a medida para tu negocio desde este botón. ¡Gracias por probar la demo!' }
  ];
  let tStep = 0;
  function startTour() { tStep = 0; $('#tour').hidden = false; showTour(); }
  function endTour() { $('#tour').hidden = true; try { localStorage.setItem(TOURKEY, '1'); } catch (e) {} }
  function showTour() {
    const step = TOUR[tStep];
    const el = $(step.sel);
    $('#tourStep').textContent = `Paso ${tStep + 1} de ${TOUR.length}`;
    $('#tourTitle').textContent = step.title;
    $('#tourText').textContent = step.text;
    $('#tourPrev').style.visibility = tStep === 0 ? 'hidden' : 'visible';
    $('#tourNext').textContent = tStep === TOUR.length - 1 ? 'Finalizar' : 'Siguiente';
    const spot = $('#tourSpot'), pop = $('#tourPop');
    const visible = el && el.offsetParent !== null && el.getBoundingClientRect().width > 0;
    if (visible) {
      const r = el.getBoundingClientRect(), p = 8;
      spot.style.display = 'block';
      spot.style.left = (r.left - p) + 'px'; spot.style.top = (r.top - p) + 'px';
      spot.style.width = (r.width + p * 2) + 'px'; spot.style.height = (r.height + p * 2) + 'px';
      pop.style.visibility = 'hidden';
      requestAnimationFrame(() => {
        const ph = pop.offsetHeight, pw = pop.offsetWidth;
        let top = r.bottom + 14;
        if (top + ph > window.innerHeight - 10) top = Math.max(10, r.top - ph - 14);
        let left = Math.min(Math.max(10, r.left), window.innerWidth - pw - 10);
        pop.style.top = top + 'px'; pop.style.left = left + 'px';
        pop.style.visibility = 'visible';
      });
    } else {
      spot.style.display = 'none';
      pop.style.visibility = 'hidden';
      requestAnimationFrame(() => {
        pop.style.top = (window.innerHeight / 2 - pop.offsetHeight / 2) + 'px';
        pop.style.left = (window.innerWidth / 2 - pop.offsetWidth / 2) + 'px';
        pop.style.visibility = 'visible';
      });
    }
  }

  /* ───────── reset ───────── */
  function resetDemo() {
    state = seed(); save();
    $('#clientSearch').value = '';
    renderNav(); renderDashboard(); renderClients(); renderPipeline();
    setView('dashboard');
    toast('Demo reiniciada');
  }

  /* ───────── icons ───────── */
  function iconUsers() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>'; }
  function iconTrend() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>'; }
  function iconCheck() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'; }
  function iconTarget() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>'; }
  function chevron(d) { return d === 'left' ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>'; }

  /* ───────── events ───────── */
  function bind() {
    // nav
    $('#sideNav').addEventListener('click', e => { const b = e.target.closest('.side-link'); if (b) setView(b.dataset.view); });
    // collapse / mobile
    $('#collapseBtn').addEventListener('click', () => $('#crm').classList.toggle('collapsed'));
    $('#burgerBtn').addEventListener('click', () => $('#crm').classList.toggle('nav-open'));
    $('#sidebarScrim').addEventListener('click', () => $('#crm').classList.remove('nav-open'));
    // search
    $('#clientSearch').addEventListener('input', renderClients);
    // new
    $('#newClientBtn').addEventListener('click', () => openClientForm(null));
    $('#newDealBtn').addEventListener('click', () => openClientForm(null));
    // table row -> detail
    $('#clientRows').addEventListener('click', e => {
      const tr = e.target.closest('tr'); if (!tr) return;
      const c = state.clients.find(x => x.id === tr.dataset.id); if (c) openClientForm(c);
    });
    // kanban moves + click card to edit
    $('#kanban').addEventListener('click', e => {
      const mv = e.target.closest('.kmove');
      if (mv) {
        e.stopPropagation();
        const card = mv.closest('.kcard'), c = state.clients.find(x => x.id === card.dataset.id);
        if (c) moveClient(c.id, STAGES[stageIdx(c.stage) + (+mv.dataset.move)].key);
        return;
      }
      const card = e.target.closest('.kcard');
      if (card) { const c = state.clients.find(x => x.id === card.dataset.id); if (c) openClientForm(c); }
    });
    bindDrag();
    // modal close
    $('#modalClose').addEventListener('click', closeModal);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });
    // tour
    $('#tourBtn').addEventListener('click', startTour);
    $('#tourNext').addEventListener('click', () => { if (tStep < TOUR.length - 1) { tStep++; showTour(); } else endTour(); });
    $('#tourPrev').addEventListener('click', () => { if (tStep > 0) { tStep--; showTour(); } });
    $('#tourSkip').addEventListener('click', endTour);
    window.addEventListener('resize', () => { if (!$('#tour').hidden) showTour(); });
    // reset
    $('#resetBtn').addEventListener('click', resetDemo);
    // esc
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { if (!backdrop.hidden) closeModal(); else if (!$('#tour').hidden) endTour(); }
    });
  }

  let dragId = null;
  function bindDrag() {
    const k = $('#kanban');
    k.addEventListener('dragstart', e => {
      const card = e.target.closest('.kcard'); if (!card) return;
      dragId = card.dataset.id; card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', dragId); } catch (x) {}
    });
    k.addEventListener('dragend', e => {
      const card = e.target.closest('.kcard'); if (card) card.classList.remove('dragging');
      $$('.kcol').forEach(c => c.classList.remove('drop-hot')); dragId = null;
    });
    k.addEventListener('dragover', e => {
      const col = e.target.closest('.kcol'); if (!col) return;
      e.preventDefault(); e.dataTransfer.dropEffect = 'move';
      $$('.kcol').forEach(c => c.classList.toggle('drop-hot', c === col));
    });
    k.addEventListener('drop', e => {
      const col = e.target.closest('.kcol'); if (!col || !dragId) return;
      e.preventDefault();
      moveClient(dragId, col.dataset.stage);
      dragId = null;
    });
  }

  /* ───────── init ───────── */
  function init() {
    bind();
    renderNav(); renderDashboard(); renderClients(); renderPipeline();
    let seen = false; try { seen = !!localStorage.getItem(TOURKEY); } catch (e) {}
    if (!seen) setTimeout(startTour, 700);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
