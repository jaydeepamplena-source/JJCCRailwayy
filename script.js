/* =========================================================
   JJCC Railways - shared script for every page
   Each HTML page sets <body data-page="..."> and this file
   runs the matching init function below.
   ========================================================= */
(() => {
  'use strict';


  /* ---------- Helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const pad = (n) => String(n).padStart(2, '0');
  const peso = (n) => '\u20B1' + Number(n).toFixed(2);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));


  // Browser storage (demo "database"). Replace with a real backend later.
  const store = {
    get(key, fallback = null) {
      try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
      catch { return fallback; }
    },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ } },
    del(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } },
  };


  // Dates
  const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const parseISO = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
  const fmtDate = (iso) => {
    const d = parseISO(iso);
    return `${d.toLocaleDateString('en-GB', { weekday: 'long' })}, ${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'long' })} ${d.getFullYear()}`;
  };
  const fmtShort = (iso) => {
    const d = parseISO(iso);
    return `${d.toLocaleDateString('en-GB', { weekday: 'short' })} ${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })} ${d.getFullYear()}`;
  };


  function setError(input, errId, message) {
    const el = document.getElementById(errId);
    if (el) el.textContent = message || '';
    if (input) {
      input.classList.toggle('invalid', Boolean(message));
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
    }
    return !message;
  }
  function setMessage(el, text, type) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) return;
    el.textContent = text || '';
    el.classList.remove('is-error', 'is-ok');
    if (type) el.classList.add(type === 'ok' ? 'is-ok' : 'is-error');
  }
  function notice(el, text, type = 'info') {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) return;
    el.className = 'notice notice-' + type;
    el.textContent = text;
  }
  function clearOnInput(root = document) {
    $$('input, select, textarea', root).forEach((input) => {
      input.addEventListener('input', () => {
        input.classList.remove('invalid');
        const err = document.getElementById(input.id + 'Error');
        if (err) err.textContent = '';
      });
    });
  }


  /* ---------- Data ---------- */
  const AMENITY = {
    wifi: ['\uD83D\uDCF6', 'Free Wi-Fi'],
    parking: ['\uD83C\uDD7F\uFE0F', 'Car parking'],
    lounge: ['\uD83D\uDECB\uFE0F', 'First Class Lounge'],
    toilets: ['\uD83D\uDEBB', 'Toilets'],
    access: ['\u267F', 'Accessible'],
    shops: ['\uD83D\uDECD\uFE0F', 'Shops'],
    cafe: ['\u2615', 'Caf\u00E9'],
    taxi: ['\uD83D\uDE95', 'Taxi rank'],
  };
  const ALL_AMEN = Object.keys(AMENITY);


  const STATIONS = [
    { code: 'TUT', name: 'Tutuban', city: 'Manila', platforms: 8, zone: 'Zone 1', amen: ALL_AMEN,
      conn: ['LRT-1 at Doroteo Jose', 'Jeepney and city bus connections'],
      access: 'Step-free access throughout. Assistance is available at passenger services.' },
    { code: 'MLO', name: 'Malolos', city: 'Bulacan', platforms: 4, zone: 'Zone 2', amen: ['wifi', 'toilets', 'access', 'cafe', 'taxi'],
      conn: ['Tricycle and jeepney stands outside the station', 'Provincial bus connections'],
      access: 'Step-free access to all platforms. Book assistance 24 hours ahead.' },
    { code: 'CRK', name: 'Clark', city: 'Pampanga', platforms: 6, zone: 'Zone 3', amen: ['wifi', 'parking', 'toilets', 'access', 'shops', 'cafe', 'taxi'],
      conn: ['Airport shuttle connections', 'Bus services to nearby cities'],
      access: 'Step-free access throughout. Assistance is available at passenger services.' },
    { code: 'TAR', name: 'Tarlac City', city: 'Tarlac', platforms: 4, zone: 'Zone 3', amen: ['wifi', 'parking', 'toilets', 'access', 'taxi'],
      conn: ['Tricycle and jeepney connections', 'Bus services to nearby towns'],
      access: 'Step-free access to all platforms. Book assistance 24 hours ahead.' },
    { code: 'ALA', name: 'Alabang', city: 'Muntinlupa', platforms: 6, zone: 'Zone 1', amen: ['wifi', 'parking', 'toilets', 'access', 'shops', 'cafe', 'taxi'],
      conn: ['City bus and UV Express terminals nearby', 'Jeepney connections'],
      access: 'Step-free access throughout. Assistance is available at passenger services.' },
    { code: 'CLB', name: 'Calamba', city: 'Laguna', platforms: 5, zone: 'Zone 2', amen: ['wifi', 'parking', 'toilets', 'access', 'cafe', 'taxi'],
      conn: ['Jeepney and tricycle connections', 'Provincial bus connections'],
      access: 'Step-free access to all platforms. Book assistance 24 hours ahead.' },
    { code: 'NGA', name: 'Naga', city: 'Camarines Sur', platforms: 4, zone: 'Zone 4', amen: ['wifi', 'toilets', 'access', 'shops', 'taxi'],
      conn: ['Jeepney and tricycle connections', 'Bus services to Bicol towns'],
      access: 'Step-free access to all platforms. Book assistance 24 hours ahead.' },
    { code: 'LGP', name: 'Legazpi', city: 'Albay', platforms: 4, zone: 'Zone 4', amen: ['wifi', 'parking', 'toilets', 'access', 'cafe', 'taxi'],
      conn: ['Jeepney and tricycle connections', 'Bus services to nearby towns'],
      access: 'Step-free access throughout. Assistance is available at passenger services.' },
  ];
  const MAP_ORDER = ['TAR', 'CRK', 'MLO', 'TUT', 'ALA', 'CLB', 'NGA', 'LGP'];


  const label = (s) => `${s.name}, ${s.city}`;
  const norm = (s) => String(s || '').trim().toLowerCase();
  const byCode = (c) => STATIONS.find((s) => s.code === c) || null;
  const findStation = (text) => {
    const t = norm(text);
    if (!t) return null;
    return STATIONS.find((s) => norm(s.code) === t || norm(s.name) === t || norm(label(s)) === t) || null;
  };


  const NAV = [
    ['book', 'Book a Journey', 'book.html'],
    ['manage', 'Manage Booking', 'manage.html'],
    ['status', 'Live Status', 'live-status.html'],
    ['refund', 'Refund & Delay', 'refund.html'],
    ['stations', 'Stations', 'stations.html'],
    ['policy', 'Travel Info', 'policy.html'],
  ];


  const FOOTER = [
    ['Book', [['Search trains', 'book.html'], ['Manage booking', 'manage.html'], ['Group travel', 'book.html']]],
    ['Travel info', [['Live status', 'live-status.html'], ['Station directory', 'stations.html'], ['Travel policy', 'policy.html']]],
    ['Help', [['Refund & Delay Repay', 'refund.html'], ['Frequently asked questions', 'policy.html'], ['Contact us', 'policy.html#help']]],
    ['Company', [['About us', '#'], ['Products & services', '#'], ['Travel journal', '#'], ['Passenger stories', '#']]],
  ];


  // Demo booking shown on Manage Booking / Refund pages
  const DEMO_BOOKING = {
    ref: 'JRC-X7K2-MNP', from: 'Tutuban', to: 'Legazpi', dateISO: '2026-09-25', dep: '07:00', arr: '11:18',
    train: 'JRC-7423', cls: 'Standard Class', passenger: 'Mr Juan Dela Cruz', seat: 'Coach A \u00B7 7A (Window)', price: 67, extra: [],
  };
  const getBookings = () => store.get('jjcc_bookings', {});
  const lookupBooking = (ref) => {
    const key = String(ref || '').trim().toUpperCase();
    return getBookings()[key] || { ...DEMO_BOOKING, extra: [] };
  };
  const saveBooking = (b) => { const all = getBookings(); all[b.ref] = b; store.set('jjcc_bookings', all); };
  const randCode = (n) => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from({ length: n }, () => c[Math.floor(Math.random() * c.length)]).join(''); };


  /* ---------- Shared header + footer ---------- */
  function renderLayout() {
    const active = document.body.dataset.active || '';
    const showSteps = document.body.dataset.steps === 'results';
    const session = store.get('jjcc_session');
    const userIcon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>';


    const nav = NAV.map(([key, text, href]) =>
      `<a href="${href}"${key === active ? ' class="is-active" aria-current="page"' : ''}>${esc(text)}</a>`).join('');


    const steps = showSteps ? `
      <ol class="steps" aria-label="Booking progress">
        <li class="done"><span class="n">\u2713</span>Search</li>
        <li class="current"><span class="n">2</span>Trains</li>
        <li><span class="n">3</span>Fare</li>
        <li><span class="n">4</span>Seat</li>
        <li><span class="n">5</span>Details</li>
        <li><span class="n">6</span>Confirm</li>
      </ol>` : '';


    const headerHTML = `
      <header class="site-header">
        <div class="container header-inner">
          <a class="logo" href="book.html" aria-label="JJCC Railways home">
            <img class="logo-img" src="JCC LOGO.png" alt="" /><span class="logo-text">JJCC RAILWAYS</span>
          </a>
          <button class="nav-toggle" id="navToggle" aria-expanded="false" aria-controls="mainNav" aria-label="Toggle menu"><span></span><span></span><span></span></button>
          <nav class="main-nav" id="mainNav" aria-label="Main">${nav}</nav>
          <a class="header-signin" id="authBtn" href="index.html">${userIcon}${session ? 'Sign out' : 'Sign In'}</a>
        </div>
        ${steps}
      </header>`;


    const cols = FOOTER.map(([title, links]) =>
      `<div><h3>${esc(title)}</h3><ul>${links.map(([t, h]) => `<li><a href="${h}">${esc(t)}</a></li>`).join('')}</ul></div>`).join('');


    const footerHTML = `
      <footer class="site-footer">
        <div class="container">
          <div class="footer-cols">${cols}</div>
          <div class="footer-bottom">
            <a class="logo logo-dark" href="book.html" aria-label="JJCC Railways home"><img src="JCC LOGO.png" alt="" width="85" height="auto"><span class="logo-text">JJCC RAILWAYS</span></a>
            <div class="legal"><a href="#">Privacy Policy</a><a href="#">Terms &amp; Conditions</a><span>&copy; 2026 JJCC Railways &middot; Department of Transportation</span></div>
          </div>
        </div>
      </footer>`;


    const h = $('#site-header'); if (h) h.outerHTML = headerHTML;
    const f = $('#site-footer'); if (f) f.outerHTML = footerHTML;


    const toggle = $('#navToggle'); const mainNav = $('#mainNav');
    if (toggle) toggle.addEventListener('click', () => {
      const open = mainNav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    const authBtn = $('#authBtn');
    if (authBtn && session) authBtn.addEventListener('click', (e) => {
      e.preventDefault(); store.del('jjcc_session'); location.href = 'index.html';
    });
  }


  /* =========================================================
     LOGIN / CREATE ACCOUNT  (index.html)
     ========================================================= */
  function initLogin() {
    const tabs = $$('.tab');
    const panels = { signin: $('#panel-signin'), signup: $('#panel-signup') };
    const switchText = $('#switchText');


    function showTab(name) {
      tabs.forEach((t) => {
        const on = t.dataset.target === name;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      Object.entries(panels).forEach(([k, p]) => { p.hidden = k !== name; });
      switchText.innerHTML = name === 'signin'
        ? 'Don\'t have an account? <a href="#" id="switchLink" class="link-strong">Create one</a>'
        : 'Already have an account? <a href="#" id="switchLink" class="link-strong">Sign in</a>';
    }
    tabs.forEach((t) => t.addEventListener('click', () => showTab(t.dataset.target)));
    switchText.addEventListener('click', (e) => {
      if (!e.target.closest('#switchLink')) return;
      e.preventDefault();
      showTab(panels.signin.hidden ? 'signin' : 'signup');
    });
    if (location.hash === '#signup') showTab('signup');


    $$('.eye').forEach((btn) => btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.toggle);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    }));


    const users = () => store.get('jjcc_users', []);
    const startSession = (name, email) => { store.set('jjcc_session', { name, email }); location.href = 'book.html'; };


    // Sign in
    const si = { email: $('#signinEmail'), pass: $('#signinPassword') };
    $('#signinForm').addEventListener('submit', (e) => {
      e.preventDefault();
      setMessage('signinMessage', '');
      const email = si.email.value.trim().toLowerCase();
      const pass = si.pass.value;
      const okE = setError(si.email, 'signinEmailError', !email ? 'Enter your email address.' : !EMAIL_RE.test(email) ? 'Enter a valid email address, like you@example.com.' : '');
      const okP = setError(si.pass, 'signinPasswordError', !pass ? 'Enter your password.' : '');
      if (!okE || !okP) return;


      const user = users().find((u) => u.email === email);
      if (user && user.password !== pass) {
        setMessage('signinMessage', 'That email and password do not match. Please try again.', 'error');
        return;
      }
      // Demo: if no account exists yet, sign in anyway using the email name.
      const name = user ? user.first : email.split('@')[0].replace(/^./, (c) => c.toUpperCase());
      setMessage('signinMessage', 'Signed in. Taking you to Book a Journey\u2026', 'ok');
      startSession(name, email);
    });


    // Create account
    const su = { first: $('#signupFirst'), last: $('#signupLast'), email: $('#signupEmail'), pass: $('#signupPassword'), terms: $('#signupTerms') };
    $('#signupForm').addEventListener('submit', (e) => {
      e.preventDefault();
      setMessage('signupMessage', '');
      const first = su.first.value.trim(), last = su.last.value.trim();
      const email = su.email.value.trim().toLowerCase(), pass = su.pass.value;
      const ok = [
        setError(su.first, 'signupFirstError', first ? '' : 'Enter your first name.'),
        setError(su.last, 'signupLastError', last ? '' : 'Enter your last name.'),
        setError(su.email, 'signupEmailError', !email ? 'Enter your email address.' : !EMAIL_RE.test(email) ? 'Enter a valid email address.' : ''),
        setError(su.pass, 'signupPasswordError', !pass ? 'Create a password.' : pass.length < 8 ? 'Use at least 8 characters.' : ''),
        setError(null, 'signupTermsError', su.terms.checked ? '' : 'Please agree to the Terms of Service and Privacy Policy.'),
      ].every(Boolean);
      if (!ok) return;


      const list = users();
      if (list.some((u) => u.email === email)) {
        setMessage('signupMessage', 'An account with this email already exists. Try signing in instead.', 'error');
        return;
      }
      list.push({ first, last, email, password: pass });
      store.set('jjcc_users', list);
      setMessage('signupMessage', 'Account created. Taking you to Book a Journey\u2026', 'ok');
      startSession(first, email);
    });


    clearOnInput();
    $('#forgotLink').addEventListener('click', (e) => {
      e.preventDefault();
      const email = si.email.value.trim();
      const valid = EMAIL_RE.test(email);
      setMessage('signinMessage', valid ? `If an account exists for ${email}, we'll send a reset link.` : 'Enter your email above, then select Forgot password.', valid ? 'ok' : 'error');
    });
    $$('.btn-social').forEach((b) => b.addEventListener('click', () => {
      const id = panels.signin.hidden ? 'signupMessage' : 'signinMessage';
      setMessage(id, `${b.dataset.provider} sign-in isn't connected yet.`, 'error');
    }));
  }


  /* =========================================================
     BOOK A JOURNEY  (book.html)
     ========================================================= */
  function attachSuggest(input, onChange) {
    const list = document.createElement('ul');
    list.className = 'suggest'; list.hidden = true; list.setAttribute('role', 'listbox');
    input.parentElement.appendChild(list);


    const pick = (code) => { input.value = label(byCode(code)); list.hidden = true; onChange(); };
    const show = () => {
      const q = norm(input.value);
      const items = STATIONS.filter((s) => !q || norm(label(s)).includes(q) || norm(s.code).includes(q));
      list.innerHTML = items.map((s) => `<li role="option" data-code="${s.code}"><span class="code">${s.code}</span>${esc(label(s))}</li>`).join('')
        || '<li class="empty">No matching station</li>';
      list.hidden = false;
    };
    input.addEventListener('focus', show);
    input.addEventListener('input', () => { show(); onChange(); });
    input.addEventListener('blur', () => {
      list.hidden = true;
      const s = findStation(input.value);
      if (s) input.value = label(s);
      onChange();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') list.hidden = true;
      if (e.key === 'Enter' && !list.hidden) {
        const first = list.querySelector('li[data-code]');
        if (first) { e.preventDefault(); pick(first.dataset.code); }
      }
    });
    list.addEventListener('mousedown', (e) => {
      const li = e.target.closest('li[data-code]');
      if (!li) return;
      e.preventDefault();
      pick(li.dataset.code);
    });
  }


  function initBook() {
    const fromIn = $('#fromInput'), toIn = $('#toInput');
    const dateIn = $('#dateInput'), retIn = $('#returnInput'), retField = $('#returnField');
    const pax = $('#paxSelect'), btn = $('#searchBtn'), hint = $('#searchHint');
    let trip = 'oneway';


    for (let i = 1; i <= 9; i++) pax.add(new Option(`${i} passenger${i > 1 ? 's' : ''}`, i));
    dateIn.min = retIn.min = todayISO();
    dateIn.value = todayISO();


    const params = new URLSearchParams(location.search);
    if (byCode(params.get('from'))) fromIn.value = label(byCode(params.get('from')));
    if (byCode(params.get('to'))) toIn.value = label(byCode(params.get('to')));


    function validate() {
      const a = findStation(fromIn.value), b = findStation(toIn.value);
      const today = todayISO();
      let msg = '';
      if (a && b && a.code === b.code) msg = 'Departure and destination must be different stations.';
      else if (dateIn.value && dateIn.value < today) msg = 'Choose a travel date from today onwards.';
      else if (trip === 'round' && retIn.value && retIn.value < dateIn.value) msg = 'Return date can\u2019t be before the outbound date.';
      const okDate = dateIn.value && dateIn.value >= today;
      const okRet = trip === 'oneway' || (retIn.value && retIn.value >= dateIn.value);
      btn.disabled = !(a && b && a.code !== b.code && okDate && okRet && !msg);
      hint.textContent = msg;
    }


    attachSuggest(fromIn, validate);
    attachSuggest(toIn, validate);
    [dateIn, retIn, pax].forEach((el) => el.addEventListener('input', validate));


    $$('.trip-tab').forEach((tab) => tab.addEventListener('click', () => {
      trip = tab.dataset.trip;
      $$('.trip-tab').forEach((t) => {
        const on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
      });
      retField.hidden = trip !== 'round';
      if (trip === 'round' && !retIn.value) retIn.value = dateIn.value;
      validate();
    }));


    $('#swapBtn').addEventListener('click', () => {
      [fromIn.value, toIn.value] = [toIn.value, fromIn.value];
      validate();
    });


    $('#searchForm').addEventListener('submit', (e) => {
      e.preventDefault();
      validate();
      if (btn.disabled) return;
      const q = new URLSearchParams({
        from: findStation(fromIn.value).code, to: findStation(toIn.value).code,
        date: dateIn.value, pax: pax.value, trip,
      });
      if (trip === 'round') q.set('return', retIn.value);
      location.href = 'results.html?' + q.toString();
    });


    validate();
  }


  /* =========================================================
     TRAIN RESULTS  (results.html)
     ========================================================= */
  const SERVICES = [
    { dep: '07:00', arr: '11:18', durMin: 258, changes: 0, via: '', price: 67, id: 'JRC-7423', op: 'JJCC Railways', plat: 5, late: 0, amen: ['wifi', 'power', 'cafe', 'bike'] },
    { dep: '09:30', arr: '13:55', durMin: 265, changes: 0, via: '', price: 82, id: 'JRC-7851', op: 'JJCC Railways', plat: 3, late: 0, amen: ['wifi', 'power', 'cafe', 'quiet'] },
    { dep: '11:15', arr: '16:08', durMin: 293, changes: 1, via: 'Malolos, Bulacan', price: 48, id: 'CPX-4102', op: 'JJCC South Line', plat: 8, late: 12, amen: ['wifi', 'power'] },
    { dep: '23:45', arr: '08:32', durMin: 527, changes: 0, via: '', price: 59, id: 'CAL-9811', op: 'JJCC Bicol Sleeper', plat: 1, late: 0, amen: ['wifi', 'power', 'cafe', 'quiet', 'sleeper'] },
    { dep: '14:42', arr: '19:20', durMin: 278, changes: 1, via: 'Naga, Camarines Sur', price: 54, id: 'TPE-9204', op: 'JJCC North Line', plat: 6, late: 0, amen: ['wifi', 'power', 'bike'] },
  ];
  const SVC_ICON = { wifi: ['\uD83D\uDCF6', 'Wi-Fi'], power: ['\uD83D\uDD0C', 'Power sockets'], cafe: ['\u2615', 'Caf\u00E9'], bike: ['\uD83D\uDEB2', 'Bike space'], quiet: ['\uD83D\uDD07', 'Quiet coach'], sleeper: ['\uD83D\uDECF\uFE0F', 'Sleeper berths'] };
  const durText = (m) => `${Math.floor(m / 60)}h ${m % 60}m`;


  function initResults() {
    const p = new URLSearchParams(location.search);
    const from = byCode(p.get('from')) || STATIONS[0];
    const to = byCode(p.get('to')) || STATIONS[1];
    const date = /^\d{4}-\d{2}-\d{2}$/.test(p.get('date') || '') ? p.get('date') : todayISO();
    const pax = Math.min(9, Math.max(1, parseInt(p.get('pax'), 10) || 1));
    const ret = p.get('return');


    $('#routeTitle').innerHTML = `${esc(from.name)} <i>to</i> ${esc(to.name)}`;
    $('#routeMeta').textContent = `${fmtDate(date)} \u00B7 ${pax} passenger${pax > 1 ? 's' : ''}${ret ? ` \u00B7 Return ${fmtDate(ret)}` : ''}`;
    $('#modifyBtn').href = `book.html?from=${from.code}&to=${to.code}`;


    const list = $('#serviceList');
    const modal = $('#selectModal');


    function render() {
      const changes = $('input[name="changes"]:checked').value;
      const sort = $('input[name="sort"]:checked').value;
      let rows = SERVICES.filter((s) => changes === 'all' || (changes === 'direct' ? s.changes === 0 : s.changes === 1));
      rows = [...rows].sort((a, b) => sort === 'price' ? a.price - b.price : sort === 'fast' ? a.durMin - b.durMin : a.dep.localeCompare(b.dep));
      $('#resultCount').textContent = `${rows.length} service${rows.length === 1 ? '' : 's'} found`;


      if (!rows.length) { list.innerHTML = '<div class="empty-state">No services match these filters. Try \u201CAll services\u201D.</div>'; return; }
      list.innerHTML = rows.map((s) => {
        const idx = SERVICES.indexOf(s);
        const status = s.late ? `<span class="st-late">\u25CF Delayed ~${s.late} min</span>` : '<span class="st-ok">\u25CF On time</span>';
        const lineText = s.changes ? `${s.changes} change \u00B7 ${esc(s.via)}` : 'Direct';
        const icons = s.amen.map((a) => `<span title="${SVC_ICON[a][1]}">${SVC_ICON[a][0]}</span>`).join('');
        return `
        <article class="svc" data-i="${idx}">
          <div class="svc-main">
            <div class="svc-time">${s.dep}<small>${esc(from.name)}</small></div>
            <div class="svc-line">${durText(s.durMin)}<div class="bar ${s.changes ? '' : 'direct'}"></div>${lineText}</div>
            <div class="svc-time">${s.arr}<small>${esc(to.name)}</small></div>
            <div class="svc-buy"><small>from</small><strong>\u20B1${s.price}</strong><button class="btn-select" data-select="${idx}">Select</button></div>
          </div>
          <div class="svc-foot">
            <span>${s.id} \u00B7 ${esc(s.op)}</span><span class="plat">Plat ${s.plat}</span>${status}
            <span class="amen">${icons}</span>
            <button class="details-btn" data-details="${idx}" aria-expanded="false">Details</button>
          </div>
          <div class="svc-details" hidden>
            <div><b>Route:</b> ${esc(label(from))} \u2192 ${s.changes ? esc(s.via) + ' \u2192 ' : ''}${esc(label(to))}</div>
            <div><b>Journey time:</b> ${durText(s.durMin)} \u00B7 ${s.changes ? s.changes + ' change' : 'Direct service'}</div>
            <div><b>On board:</b> ${s.amen.map((a) => SVC_ICON[a][1]).join(', ')}</div>
            <div><b>Fare:</b> \u20B1${s.price} per passenger (Standard Class, Advance Saver)</div>
          </div>
        </article>`;
      }).join('');
    }
    $$('input[name="changes"], input[name="sort"]').forEach((r) => r.addEventListener('change', render));


    list.addEventListener('click', (e) => {
      const d = e.target.closest('[data-details]');
      if (d) {
        const box = d.closest('.svc').querySelector('.svc-details');
        box.hidden = !box.hidden;
        d.setAttribute('aria-expanded', String(!box.hidden));
        return;
      }
      const s = e.target.closest('[data-select]');
      if (s) openModal(SERVICES[Number(s.dataset.select)]);
    });


    function openModal(s) {
      const total = s.price * pax;
      modal.hidden = false;
      modal.innerHTML = `
        <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="mTitle">
          <h2 id="mTitle">Confirm your journey</h2>
          <p class="muted">Review the details below, then confirm to receive a booking reference.</p>
          <div class="modal-rows">
            <div><span>Route</span><b>${esc(from.name)} \u2192 ${esc(to.name)}</b></div>
            <div><span>Date</span><b>${esc(fmtShort(date))}</b></div>
            <div><span>Time</span><b>${s.dep} \u2192 ${s.arr}</b></div>
            <div><span>Service</span><b>${s.id}</b></div>
            <div><span>Passengers</span><b>${pax}</b></div>
            <div><span>Total fare</span><b>${peso(total)}</b></div>
          </div>
          <div class="modal-actions">
            <button class="btn-outline" id="mBack">Back</button>
            <button class="btn-gold" id="mConfirm">Confirm booking</button>
          </div>
        </div>`;
      $('#mBack').addEventListener('click', closeModal);
      $('#mConfirm').addEventListener('click', () => {
        const session = store.get('jjcc_session');
        const booking = {
          ref: `JRC-${randCode(4)}-${randCode(3)}`, from: from.name, to: to.name, dateISO: date, dep: s.dep, arr: s.arr, train: s.id,
          cls: 'Standard Class', passenger: session ? session.name : 'Guest passenger',
          seat: `Coach ${'ABCD'[Math.floor(Math.random() * 4)]} \u00B7 ${1 + Math.floor(Math.random() * 12)}${'ABCD'[Math.floor(Math.random() * 4)]} (Window)`,
          price: total, extra: [],
        };
        saveBooking(booking);
        modal.innerHTML = `
          <div class="modal-box" role="dialog" aria-modal="true">
            <h2>Booking confirmed</h2>
            <p class="muted">Keep your booking reference. You can use it to manage your trip.</p>
            <div class="ref-big">${booking.ref}</div>
            <div class="modal-actions" style="margin-top:18px">
              <a class="btn-outline" href="book.html">Book another</a>
              <a class="btn-gold" href="manage.html">Manage booking</a>
            </div>
          </div>`;
      });
    }
    function closeModal() { modal.hidden = true; modal.innerHTML = ''; }
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });


    render();
  }


  /* =========================================================
     MANAGE BOOKING  (manage.html)
     ========================================================= */
  function initManage() {
    const find = $('#manageFind'), view = $('#manageView');
    const refIn = $('#mgRef'), emailIn = $('#mgEmail');
    let booking = null;


    function paintCard() {
      const extra = booking.extra && booking.extra.length ? ` +${booking.extra.length}` : '';
      $('#bcRoute').textContent = `${booking.from} \u2192 ${booking.to}`;
      $('#bcDate').textContent = `${fmtDate(booking.dateISO)} \u00B7 ${booking.dep} \u2192 ${booking.arr}`;
      $('#bcRef').textContent = booking.ref;
      $('#bcPassenger').textContent = booking.passenger + extra;
      $('#bcTrain').textContent = booking.train;
      $('#bcClass').textContent = booking.cls;
      $('#bcSeat').textContent = booking.seat;
      $('#curDate').textContent = fmtDate(booking.dateISO);
    }


    $('#manageForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const okR = setError(refIn, 'mgRefError', refIn.value.trim() ? '' : 'Enter your booking reference.');
      const okE = setError(emailIn, 'mgEmailError', !emailIn.value.trim() ? 'Enter your booking email.' : !EMAIL_RE.test(emailIn.value.trim()) ? 'Enter a valid email address.' : '');
      if (!okR || !okE) return;
      booking = lookupBooking(refIn.value);
      paintCard();
      find.hidden = true; view.hidden = false;
      openPanel(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    clearOnInput($('#manageForm'));


    $('#searchAnother').addEventListener('click', (e) => {
      e.preventDefault();
      view.hidden = true; find.hidden = false; openPanel(null);
    });


    // Tiles <-> panels
    function openPanel(name) {
      $$('.tile').forEach((t) => {
        const on = t.dataset.action === name;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-pressed', String(on));
      });
      $$('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== name; });
      if (name) $(`[data-panel="${name}"]`).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    $$('.tile').forEach((t) => t.addEventListener('click', () => openPanel(t.classList.contains('is-active') ? null : t.dataset.action)));


    // Change travel date (check, then confirm)
    const newDate = $('#newDate'), dateBtn = $('#dateBtn');
    let datePending = false;
    newDate.min = todayISO();
    newDate.addEventListener('input', () => { datePending = false; dateBtn.textContent = 'Check availability'; });
    dateBtn.addEventListener('click', () => {
      const v = newDate.value;
      if (!v) return notice('dateNotice', 'Choose a new travel date first.', 'err');
      if (v < todayISO()) return notice('dateNotice', 'The new date can\u2019t be in the past.', 'err');
      if (v === booking.dateISO) return notice('dateNotice', 'Choose a date different from your current one.', 'err');
      if (!datePending) {
        datePending = true;
        dateBtn.textContent = 'Confirm date change';
        return notice('dateNotice', `Seats are available on ${fmtDate(v)}. An exchange fee of up to \u20B110 may apply.`, 'ok');
      }
      booking.dateISO = v; saveBooking(booking); paintCard();
      datePending = false; dateBtn.textContent = 'Check availability'; newDate.value = '';
      notice('dateNotice', `Done. Your journey is now on ${fmtDate(v)}.`, 'ok');
    });


    // Upgrade class
    let chosenClass = null;
    $$('.opt[data-class]').forEach((o) => o.addEventListener('click', () => {
      chosenClass = o.dataset.class;
      $$('.opt[data-class]').forEach((x) => x.classList.toggle('is-selected', x === o));
      $('#upBtn').disabled = false;
    }));
    $('#upBtn').addEventListener('click', () => {
      if (!chosenClass) return;
      if (booking.cls === chosenClass) return notice('upNotice', `Your booking is already in ${chosenClass}.`, 'info');
      booking.cls = chosenClass; booking.price = Number(booking.price) + 61; saveBooking(booking); paintCard();
      notice('upNotice', `Upgraded to ${chosenClass}. An extra ${peso(61)} will be charged.`, 'ok');
    });


    // Add passenger
    $('#pBtn').addEventListener('click', () => {
      const f = $('#pFirst'), l = $('#pLast');
      const ok = [setError(f, 'pFirstError', f.value.trim() ? '' : 'Enter a first name.'), setError(l, 'pLastError', l.value.trim() ? '' : 'Enter a last name.')].every(Boolean);
      if (!ok) return;
      booking.extra = booking.extra || [];
      booking.extra.push(`${f.value.trim()} ${l.value.trim()}`);
      booking.price = Number(booking.price) + 82; saveBooking(booking); paintCard();
      notice('pNotice', `${f.value.trim()} ${l.value.trim()} was added. Seat availability must still be confirmed.`, 'ok');
      f.value = l.value = '';
    });


    // Re-issue ticket
    $('#reBtn').addEventListener('click', () => {
      const em = $('#reEmail');
      if (!setError(em, 'reEmailError', !em.value.trim() ? 'Enter an email address.' : !EMAIL_RE.test(em.value.trim()) ? 'Enter a valid email address.' : '')) return;
      notice('reNotice', `Your e-ticket has been sent to ${em.value.trim()}.`, 'ok');
      em.value = '';
    });
    clearOnInput($('#manageView'));
  }


  /* =========================================================
     LIVE STATUS  (live-status.html)
     ========================================================= */
  const BOARD = {
    TUT: [
      { dest: 'Legazpi, Albay', op: 'JJCC Railways \u00B7 Direct', sched: '07:00', exp: '', plat: 5, svc: 'JRC-7423', status: 'On time', dur: 258, stops: ['Tutuban', 'Malolos', 'Clark', 'Tarlac City', 'Naga', 'Legazpi'] },
      { dest: 'Legazpi, Albay', op: 'JJCC Railways \u00B7 Direct', sched: '09:30', exp: '', plat: 3, svc: 'JRC-7851', status: 'On time', dur: 265, stops: ['Tutuban', 'Malolos', 'Clark', 'Naga', 'Legazpi'] },
      { dest: 'Legazpi', op: 'JJCC North Line \u00B7 via Tarlac City, Tarlac', sched: '08:15', exp: '08:27', plat: 6, svc: 'TPE-9204', status: 'Delayed 12 min', dur: 280, stops: ['Tutuban', 'Malolos', 'Clark', 'Tarlac City', 'Legazpi'] },
      { dest: 'Legazpi', op: 'JJCC South Line \u00B7 Direct', sched: '06:45', exp: '', plat: 8, svc: 'CPX-4102', status: 'Arrived', dur: 290, stops: ['Tutuban', 'Alabang', 'Calamba', 'Naga', 'Legazpi'] },
      { dest: 'Vigan, Ilocos Sur', op: 'JJCC Bicol Sleeper \u00B7 Direct', sched: '23:45', exp: '', plat: 1, svc: 'CAL-9811', status: 'On time', dur: 527, stops: ['Tutuban', 'Malolos', 'Clark', 'Tarlac City', 'Vigan'] },
    ],
    LGP: [
      { dest: 'Tutuban, Manila', op: 'JJCC Railways \u00B7 Direct', sched: '06:10', exp: '', plat: 2, svc: 'JRC-7422', status: 'On time', dur: 258, stops: ['Legazpi', 'Naga', 'Clark', 'Malolos', 'Tutuban'] },
      { dest: 'Naga, Camarines Sur', op: 'JJCC Bicol Local \u00B7 Direct', sched: '08:40', exp: '08:52', plat: 4, svc: 'BCL-3310', status: 'Delayed 12 min', dur: 95, stops: ['Legazpi', 'Naga'] },
      { dest: 'Tutuban, Manila', op: 'JJCC Bicol Sleeper \u00B7 Direct', sched: '19:30', exp: '', plat: 1, svc: 'CAL-9812', status: 'On time', dur: 527, stops: ['Legazpi', 'Naga', 'Tarlac City', 'Tutuban'] },
    ],
    MLO: [
      { dest: 'Tutuban, Manila', op: 'JJCC Commuter \u00B7 Direct', sched: '06:20', exp: '', plat: 1, svc: 'COM-1204', status: 'On time', dur: 70, stops: ['Malolos', 'Tutuban'] },
      { dest: 'Clark, Pampanga', op: 'JJCC North Line \u00B7 Direct', sched: '07:05', exp: '', plat: 3, svc: 'TPE-9100', status: 'On time', dur: 55, stops: ['Malolos', 'Clark'] },
      { dest: 'Legazpi, Albay', op: 'JJCC Railways \u00B7 Direct', sched: '07:50', exp: '', plat: 2, svc: 'JRC-7423', status: 'Arrived', dur: 190, stops: ['Malolos', 'Clark', 'Naga', 'Legazpi'] },
    ],
    NGA: [
      { dest: 'Legazpi, Albay', op: 'JJCC Bicol Local \u00B7 Direct', sched: '09:15', exp: '', plat: 2, svc: 'BCL-3311', status: 'On time', dur: 95, stops: ['Naga', 'Legazpi'] },
      { dest: 'Tutuban, Manila', op: 'JJCC Railways \u00B7 Direct', sched: '10:05', exp: '10:20', plat: 1, svc: 'JRC-7424', status: 'Delayed 15 min', dur: 190, stops: ['Naga', 'Clark', 'Malolos', 'Tutuban'] },
    ],
    CRK: [
      { dest: 'Tarlac City, Tarlac', op: 'JJCC North Line \u00B7 Direct', sched: '08:30', exp: '08:42', plat: 4, svc: 'TPE-9204', status: 'Delayed 12 min', dur: 55, stops: ['Clark', 'Tarlac City'] },
      { dest: 'Tutuban, Manila', op: 'JJCC Commuter \u00B7 Direct', sched: '09:00', exp: '', plat: 2, svc: 'COM-1210', status: 'On time', dur: 85, stops: ['Clark', 'Malolos', 'Tutuban'] },
      { dest: 'Legazpi, Albay', op: 'JJCC Railways \u00B7 Direct', sched: '09:45', exp: '', plat: 5, svc: 'JRC-7852', status: 'On time', dur: 210, stops: ['Clark', 'Naga', 'Legazpi'] },
    ],
  };
  const NETWORK = [
    ['East Coast Main Line', 'Good service'], ['West Coast Main Line', 'Good service'], ['North Main Line', 'Minor delays'],
    ['JJCC South Line', 'Good service'], ['JJCC Bicol Sleeper', 'Good service'],
  ];


  function initStatus() {
    // Live clock (updates every second)
    const clock = $('#clock');
    const tick = () => { const d = new Date(); clock.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
    tick(); setInterval(tick, 1000);


    $('#networkList').innerHTML = NETWORK.map(([n, s]) => `<li>${n}<span class="${s.startsWith('Minor') ? 'minor' : ''}">${s}</span></li>`).join('');


    let current = 'TUT', selected = null;
    const chips = $('#stationChips'), body = $('#boardBody'), search = $('#boardSearch'), card = $('#serviceCard');


    chips.innerHTML = Object.keys(BOARD).map((c) => `<button class="chip" data-code="${c}">${esc(byCode(c).name)}</button>`).join('');
    chips.addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      current = b.dataset.code; selected = null; search.value = ''; paintChips(); paintBoard(); paintCard();
    });
    const paintChips = () => $$('.chip', chips).forEach((c) => c.classList.toggle('is-active', c.dataset.code === current));


    function paintBoard() {
      const st = byCode(current);
      $('#boardTitle').textContent = `${label(st)} \u00B7 DEPARTURES`.toUpperCase();
      const q = norm(search.value);
      const rows = BOARD[current].filter((r) => !q || norm(r.svc).includes(q) || norm(r.dest).includes(q));
      body.innerHTML = rows.length ? rows.map((r) => {
        const cls = r.status === 'Arrived' ? 's-arr' : r.status.startsWith('Delayed') ? 's-late' : 's-on';
        return `<tr tabindex="0" data-svc="${r.svc}" class="${selected === r.svc ? 'is-selected' : ''}">
          <td class="dest"><b>${esc(r.dest)}</b><small>${esc(r.op)}</small></td>
          <td class="time">${r.sched}</td>
          <td>${r.exp ? `<span class="exp-late">${r.exp}</span>` : '\u2014'}</td>
          <td><span class="pbadge">${r.plat}</span></td>
          <td>${r.svc}</td>
          <td class="${cls}">${r.status}</td></tr>`;
      }).join('') : '<tr><td colspan="6" style="text-align:center;color:#7f8cab">No services match your search.</td></tr>';
    }
    const select = (tr) => { selected = tr.dataset.svc; paintBoard(); paintCard(); };
    body.addEventListener('click', (e) => { const tr = e.target.closest('tr[data-svc]'); if (tr) select(tr); });
    body.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const tr = e.target.closest('tr[data-svc]'); if (tr) select(tr); } });
    search.addEventListener('input', paintBoard);


    function paintCard() {
      const r = BOARD[current].find((x) => x.svc === selected);
      if (!r) {
        card.innerHTML = '<div class="big">\uD83D\uDE82</div><h3>Select a service</h3><p>Click any train to see live route progress and calling points</p>';
        card.className = 'card select-card'; return;
      }
      const [h, m] = r.sched.split(':').map(Number);
      const start = h * 60 + m + (r.exp ? (Number(r.exp.slice(0, 2)) * 60 + Number(r.exp.slice(3)) - (h * 60 + m)) : 0);
      const n = r.stops.length;
      const passedCount = r.status === 'Arrived' ? n : 0;
      card.className = 'card route-prog';
      card.innerHTML = `<h3>${r.svc} \u00B7 ${esc(r.dest)}</h3>
        <p class="sub">${esc(r.op)} \u00B7 Platform ${r.plat} \u00B7 ${r.status}</p>
        <ul class="stops">${r.stops.map((s, i) => {
          const t = start + Math.round((r.dur * i) / (n - 1));
          const time = `${pad(Math.floor(t / 60) % 24)}:${pad(t % 60)}`;
          const cls = i < passedCount ? 'passed' : i === passedCount ? 'next' : '';
          return `<li class="${cls}"><span>${esc(s)}</span><span class="t">${time}</span></li>`;
        }).join('')}</ul>`;
    }
    paintChips(); paintBoard(); paintCard();
  }


  /* =========================================================
     REFUND & DELAY  (refund.html)
     ========================================================= */
  function initRefund() {
    const stages = { find: $('#refundFind'), choose: $('#refundChoose'), done: $('#refundDone') };
    const show = (name) => { Object.entries(stages).forEach(([k, el]) => { el.hidden = k !== name; }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    const refIn = $('#rfRef'), emailIn = $('#rfEmail');
    const submit = $('#submitBtn');
    let booking = null, mode = 'delay';


    $('#rfForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const okR = setError(refIn, 'rfRefError', refIn.value.trim() ? '' : 'Enter your booking reference.');
      const okE = setError(emailIn, 'rfEmailError', !emailIn.value.trim() ? 'Enter your booking email.' : !EMAIL_RE.test(emailIn.value.trim()) ? 'Enter a valid email address.' : '');
      if (!okR || !okE) return;
      booking = lookupBooking(refIn.value);
      $('#sumRef').textContent = booking.ref;
      $('#sumRoute').textContent = `${booking.from} \u2192 ${booking.to}`;
      $('#sumMeta').textContent = `${booking.train} \u00B7 ${fmtShort(booking.dateISO)} \u00B7 ${booking.cls} \u00B7 ${peso(booking.price)}`;
      $('#cxFare').textContent = peso(booking.price);
      $('#cxAdmin').textContent = '-' + peso(10);
      setMode('delay');
      show('choose');
    });
    clearOnInput($('#rfForm'));
    $('#changeBooking').addEventListener('click', () => show('find'));
    $('#cancelBtn').addEventListener('click', () => show('find'));


    function setMode(m) {
      mode = m;
      $$('.choice').forEach((c) => c.classList.toggle('is-active', c.dataset.mode === m));
      $('#delayPanel').hidden = m !== 'delay';
      $('#cancelPanel').hidden = m !== 'cancel';
      submit.textContent = m === 'delay' ? 'Submit Delay Repay claim' : 'Submit cancellation request';
      updateSubmit();
    }
    function updateSubmit() {
      submit.disabled = mode === 'delay' && !(Number($('#delayMin').value) > 0 && $('#delayReason').value);
    }
    $$('.choice').forEach((c) => c.addEventListener('click', () => setMode(c.dataset.mode)));
    $('#delayMin').addEventListener('input', updateSubmit);
    $('#delayReason').addEventListener('change', updateSubmit);


    submit.addEventListener('click', () => {
      const claimRef = 'CLM-' + randCode(5);
      let title, text, payout, method;
      if (mode === 'delay') {
        const mins = Number($('#delayMin').value);
        const pct = mins >= 120 ? 100 : mins >= 60 ? 50 : mins >= 30 ? 25 : 0;
        if (!pct) {
          setError($('#delayMin'), 'delayMinError', 'Delay Repay applies to delays of 30 minutes or more.');
          return;
        }
        setError($('#delayMin'), 'delayMinError', '');
        title = 'Claim submitted';
        text = 'Your refund claim has been received.';
        payout = `${pct === 100 ? 'Full ticket value' : pct + '% of ticket value'} (${peso(booking.price * pct / 100)})`;
        method = 'Original payment card (3\u20135 days)';
      } else {
        title = 'Request submitted';
        text = 'Your cancellation request has been received.';
        payout = `${peso(0)} (non-refundable fare)`;
        method = 'No payout due. You can still exchange for a later date.';
      }
      $('#doneTitle').textContent = title;
      $('#doneText').innerHTML = `${text}<br>We'll review and process within 5 working days.`;
      $('#claimRef').textContent = claimRef;
      $('#claimPayout').textContent = 'Expected payout: ' + payout;
      $('#claimMethod').textContent = 'Method: ' + method;
      show('done');
    });
  }


  /* =========================================================
     STATIONS  (stations.html)
     ========================================================= */
  function initStations() {
    let current = byCode(new URLSearchParams(location.search).get('code')) || STATIONS[0];
    const listEl = $('#stList'), searchEl = $('#stSearch'), detail = $('#stDetail'), map = $('#stMap');


    // Network map (simple SVG line, north to south)
    const pts = MAP_ORDER.map((code, i) => ({ code, x: 210 + Math.sin(i * 0.9) * 14 + i * 9, y: 26 + i * 30 }));
    map.innerHTML = `<svg viewBox="0 0 480 262" role="img" aria-label="Network map">
      <polyline points="${pts.map((p) => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="#14234f" stroke-width="2.5" stroke-linejoin="round"/>
      ${pts.map((p) => `<g class="node" data-code="${p.code}" tabindex="0" role="button" aria-label="${esc(byCode(p.code).name)}"><circle cx="${p.x}" cy="${p.y}" r="6"/><text x="${p.x - 14}" y="${p.y + 3}" text-anchor="end">${p.code}</text></g>`).join('')}
    </svg><span class="map-hint">Click a station for details</span>`;
    map.addEventListener('click', (e) => { const g = e.target.closest('.node'); if (g) choose(g.dataset.code); });
    map.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const g = e.target.closest('.node'); if (g) choose(g.dataset.code); } });


    function paintList() {
      const q = norm(searchEl.value);
      const rows = STATIONS.filter((s) => !q || norm(label(s)).includes(q) || norm(s.code).includes(q));
      listEl.innerHTML = rows.length ? rows.map((s) => `
        <button class="st-item ${s.code === current.code ? 'is-active' : ''}" data-code="${s.code}">
          <span class="code">${s.code}</span><span><b>${esc(label(s))}</b><small>${s.platforms} platforms</small></span><span class="chev">\u203A</span>
        </button>`).join('') : '<p class="muted">No stations match your search.</p>';
    }
    function paintDetail() {
      const s = current;
      detail.innerHTML = `
        <div class="detail-head"><div class="code">${s.code}</div><h2>${esc(label(s))}</h2><p>${s.platforms} platforms \u00B7 ${s.zone}</p></div>
        <div class="detail-body">
          <span class="lbl">Station amenities</span>
          <div class="amen-grid">${ALL_AMEN.map((k) => `<div class="${s.amen.includes(k) ? '' : 'off'}"><span>${AMENITY[k][0]}</span>${AMENITY[k][1]}</div>`).join('')}</div>
          <span class="lbl">Connections</span>
          <ul>${s.conn.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
          <span class="lbl">Accessibility</span>
          <p>${esc(s.access)}</p>
        </div>
        <a class="btn-primary" href="book.html?from=${s.code}">Search trains from ${esc(s.name)}</a>`;
      $$('.node', map).forEach((g) => g.classList.toggle('is-active', g.dataset.code === s.code));
    }
    function choose(code) { current = byCode(code); paintList(); paintDetail(); }
    listEl.addEventListener('click', (e) => { const b = e.target.closest('.st-item'); if (b) choose(b.dataset.code); });
    searchEl.addEventListener('input', paintList);
    paintList(); paintDetail();
  }


  /* =========================================================
     TRAVEL INFO  (policy.html)
     ========================================================= */
  function initPolicy() {
    const items = $$('.acc');
    const toggle = (acc, open) => {
      const on = open ?? !acc.classList.contains('is-open');
      acc.classList.toggle('is-open', on);
      $('.acc-btn', acc).setAttribute('aria-expanded', String(on));
      $('.acc-body', acc).hidden = !on;
    };
    items.forEach((acc) => $('.acc-btn', acc).addEventListener('click', () => toggle(acc)));
    $$('.pchip').forEach((chip) => chip.addEventListener('click', () => {
      const acc = document.getElementById(chip.dataset.target);
      if (!acc) return;
      toggle(acc, true);
      acc.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
  }


  /* ---------- Start ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    renderLayout();
    const pages = { login: initLogin, book: initBook, results: initResults, manage: initManage, status: initStatus, refund: initRefund, stations: initStations, policy: initPolicy };
    const fn = pages[document.body.dataset.page];
    if (fn) fn();
  });
})();

