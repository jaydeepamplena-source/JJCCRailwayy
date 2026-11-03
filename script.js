
/* =========================================================
   JJCC Railways - shared script for every page
   Each HTML page sets <body data-page="..."> and this file
   runs the matching init function below.
   ========================================================= */
(() => {
  'use strict';

  // SUPABASE CONNECTION
  const SUPABASE_URL = 'https://ocjyyfzuoiprwajwyize.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_XZu8suOKCWB9Zp7dYhzxgQ_Yaq5zxo8';

  if (!window.supabase) {
    console.error('Supabase JS library is missing. Add the Supabase CDN script before script.js in every HTML page.');
    return;
  }

  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


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
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* ignore */
      }
    },
    del(key) {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };


  // Dates
  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const parseISO = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

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

    if (type) {
      el.classList.add(type === 'ok' ? 'is-ok' : 'is-error');
    }
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
    {
      code: 'TUT',
      name: 'Tutuban',
      city: 'Manila',
      platforms: 8,
      zone: 'Zone 1',
      amen: ALL_AMEN,
      conn: ['LRT-1 at Doroteo Jose', 'Jeepney and city bus connections'],
      access: 'Step-free access throughout. Assistance is available at passenger services.'
    },
    {
      code: 'MLO',
      name: 'Malolos',
      city: 'Bulacan',
      platforms: 4,
      zone: 'Zone 2',
      amen: ['wifi', 'toilets', 'access', 'cafe', 'taxi'],
      conn: ['Tricycle and jeepney stands outside the station', 'Provincial bus connections'],
      access: 'Step-free access to all platforms. Book assistance 24 hours ahead.'
    },
    {
      code: 'CRK',
      name: 'Clark',
      city: 'Pampanga',
      platforms: 6,
      zone: 'Zone 3',
      amen: ['wifi', 'parking', 'toilets', 'access', 'shops', 'cafe', 'taxi'],
      conn: ['Airport shuttle connections', 'Bus services to nearby cities'],
      access: 'Step-free access throughout. Assistance is available at passenger services.'
    },
    {
      code: 'TAR',
      name: 'Tarlac City',
      city: 'Tarlac',
      platforms: 4,
      zone: 'Zone 3',
      amen: ['wifi', 'parking', 'toilets', 'access', 'taxi'],
      conn: ['Tricycle and jeepney connections', 'Bus services to nearby towns'],
      access: 'Step-free access to all platforms. Book assistance 24 hours ahead.'
    },
    {
      code: 'ALA',
      name: 'Alabang',
      city: 'Muntinlupa',
      platforms: 6,
      zone: 'Zone 1',
      amen: ['wifi', 'parking', 'toilets', 'access', 'shops', 'cafe', 'taxi'],
      conn: ['City bus and UV Express terminals nearby', 'Jeepney connections'],
      access: 'Step-free access throughout. Assistance is available at passenger services.'
    },
    {
      code: 'CLB',
      name: 'Calamba',
      city: 'Laguna',
      platforms: 5,
      zone: 'Zone 2',
      amen: ['wifi', 'parking', 'toilets', 'access', 'cafe', 'taxi'],
      conn: ['Jeepney and tricycle connections', 'Provincial bus connections'],
      access: 'Step-free access to all platforms. Book assistance 24 hours ahead.'
    },
    {
      code: 'NGA',
      name: 'Naga',
      city: 'Camarines Sur',
      platforms: 4,
      zone: 'Zone 4',
      amen: ['wifi', 'toilets', 'access', 'shops', 'taxi'],
      conn: ['Jeepney and tricycle connections', 'Bus services to Bicol towns'],
      access: 'Step-free access to all platforms. Book assistance 24 hours ahead.'
    },
    {
      code: 'LGP',
      name: 'Legazpi',
      city: 'Albay',
      platforms: 4,
      zone: 'Zone 4',
      amen: ['wifi', 'parking', 'toilets', 'access', 'cafe', 'taxi'],
      conn: ['Jeepney and tricycle connections', 'Bus services to nearby towns'],
      access: 'Step-free access throughout. Assistance is available at passenger services.'
    },
  ];

  const MAP_ORDER = ['TAR', 'CRK', 'MLO', 'TUT', 'ALA', 'CLB', 'NGA', 'LGP'];


  const label = (s) => `${s.name}, ${s.city}`;
  const norm = (s) => String(s || '').trim().toLowerCase();
  const byCode = (c) => STATIONS.find((s) => s.code === c) || null;

  const findStation = (text) => {
    const t = norm(text);
    if (!t) return null;

    return STATIONS.find((s) =>
      norm(s.code) === t ||
      norm(s.name) === t ||
      norm(label(s)) === t
    ) || null;
  };


  // Load active station records from Supabase while preserving local display details.
  async function loadStationsFromSupabase() {
    const { data, error } = await supabaseClient
      .from('stations')
      .select('station_code, station_name, city, province')
      .eq('is_active', true)
      .order('station_name', { ascending: true });

    if (error) throw error;

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No active stations were returned from the database.');
    }

    const localDetails = new Map(STATIONS.map((station) => [station.code, station]));

    const databaseStations = data.map((row) => {
      const details = localDetails.get(row.station_code) || {};
      const city = String(row.city || '').trim();
      const stationName = String(row.station_name || '').trim();
      const province = String(row.province || '').trim();

      const displayCity = city && city.toLowerCase() !== stationName.toLowerCase()
        ? city
        : (province || city);

      return {
        ...details,
        code: row.station_code,
        name: stationName,
        city: displayCity,
        platforms: details.platforms ?? null,
        zone: details.zone ?? '',
        amen: details.amen ?? [],
        conn: details.conn ?? [],
        access: details.access ?? 'Station facility details are not available yet.'
      };
    });

    // Keep the same array reference so all page functions use the database rows.
    STATIONS.splice(0, STATIONS.length, ...databaseStations);

    console.info(`Loaded ${STATIONS.length} active stations from Supabase.`);
    return STATIONS.length;
  }


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
    ref: 'JRC-X7K2-MNP',
    from: 'Tutuban',
    to: 'Legazpi',
    dateISO: '2026-09-25',
    dep: '07:00',
    arr: '11:18',
    train: 'JRC-7423',
    cls: 'Standard Class',
    passenger: 'Mr Juan Dela Cruz',
    seat: 'Coach A · 7A (Window)',
    price: 67,
    extra: [],
  };

  const getBookings = () => store.get('jjcc_bookings', {});

  const lookupBooking = (ref) => {
    const key = String(ref || '').trim().toUpperCase();
    return getBookings()[key] || { ...DEMO_BOOKING, extra: [] };
  };

  const saveBooking = (b) => {
    const all = getBookings();
    all[b.ref] = b;
    store.set('jjcc_bookings', all);
  };

  const randCode = (n) => {
    const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: n }, () => c[Math.floor(Math.random() * c.length)]).join('');
  };


  /* ---------- Shared header + footer ---------- */
  function renderLayout() {
    const active = document.body.dataset.active || '';
    const showSteps = document.body.dataset.steps === 'results';
    const session = store.get('jjcc_session');
    const userIcon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>';

    const nav = NAV.map(([key, text, href]) =>
      `<a href="${href}"${key === active ? ' class="is-active" aria-current="page"' : ''}>${esc(text)}</a>`
    ).join('');

    const steps = showSteps ? `
      <ol class="steps" aria-label="Booking progress">
        <li class="done"><span class="n">✓</span>Search</li>
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
            <img class="logo-img" src="JCC LOGO.png" alt="" />
            <span class="logo-text">JJCC RAILWAYS</span>
          </a>
          <button class="nav-toggle" id="navToggle" aria-expanded="false" aria-controls="mainNav" aria-label="Toggle menu">
            <span></span><span></span><span></span>
          </button>
          <nav class="main-nav" id="mainNav" aria-label="Main">${nav}</nav>
          <a class="header-signin" id="authBtn" href="index.html">${userIcon}${session ? 'Sign out' : 'Sign In'}</a>
        </div>
        ${steps}
      </header>`;

    const cols = FOOTER.map(([title, links]) =>
      `<div><h3>${esc(title)}</h3><ul>${links.map(([t, h]) =>
        `<li><a href="${h}">${esc(t)}</a></li>`
      ).join('')}</ul></div>`
    ).join('');

    const footerHTML = `
      <footer class="site-footer">
        <div class="container">
          <div class="footer-cols">${cols}</div>
          <div class="footer-bottom">
            <a class="logo logo-dark" href="book.html" aria-label="JJCC Railways home">
              <img src="JCC LOGO.png" alt="" width="85" height="auto">
              <span class="logo-text">JJCC RAILWAYS</span>
            </a>
            <div class="legal">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms &amp; Conditions</a>
              <span>&copy; 2026 JJCC Railways &middot; Department of Transportation</span>
            </div>
          </div>
        </div>
      </footer>`;

    const h = $('#site-header');
    if (h) h.outerHTML = headerHTML;

    const f = $('#site-footer');
    if (f) f.outerHTML = footerHTML;

    const toggle = $('#navToggle');
    const mainNav = $('#mainNav');

    if (toggle) {
      toggle.addEventListener('click', () => {
        const open = mainNav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(open));
      });
    }

    const authBtn = $('#authBtn');

    if (authBtn && session) {
      authBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        try {
          await supabaseClient.auth.signOut();
        } catch (error) {
          console.error('Supabase sign-out error:', error);
        }

        store.del('jjcc_session');
        location.href = 'index.html';
      });
    }
  }


  /* =========================================================
     LOGIN / CREATE ACCOUNT  (index.html)
     ========================================================= */
  function initLogin() {
    const tabs = $$('.tab');
    const panels = {
      signin: $('#panel-signin'),
      signup: $('#panel-signup')
    };
    const switchText = $('#switchText');

    function showTab(name) {
      tabs.forEach((t) => {
        const on = t.dataset.target === name;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });

      Object.entries(panels).forEach(([k, p]) => {
        p.hidden = k !== name;
      });

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


    // ROLE-BASED LOGIN REDIRECTION
    // The role is always read from Supabase. Never trust a role stored in the browser.
    const ROLE_REDIRECTS = {
      user: 'book.html',
      admin: 'admin.html',
      super_admin: 'superadmin.html'
    };

    async function startSession(user) {
      if (!user || !user.id) {
        throw new Error('Unable to identify the signed-in account.');
      }

      const { data: profile, error } = await supabaseClient
        .from('profiles')
        .select('user_id, full_name, role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!profile) {
        throw new Error(
          'Your profile was not found. Please contact the administrator.'
        );
      }

      const destination = ROLE_REDIRECTS[profile.role];

      if (!destination) {
        throw new Error(
          'Invalid account role. Please contact the administrator.'
        );
      }

      const name =
        profile.full_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.user_metadata?.first_name ||
        user.email?.split('@')[0] ||
        'JJCC User';

      store.set('jjcc_session', {
        name,
        email: user.email || '',
        role: profile.role
      });

      window.location.replace(destination);
    }

    // SIGN IN - SUPABASE AUTH
    const si = {
      email: $('#signinEmail'),
      pass: $('#signinPassword')
    };

    $('#signinForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      setMessage('signinMessage', '');

      const email = si.email.value.trim().toLowerCase();
      const pass = si.pass.value;

      const okE = setError(
        si.email,
        'signinEmailError',
        !email ? 'Enter your email address.' :
        !EMAIL_RE.test(email) ? 'Enter a valid email address.' : ''
      );

      const okP = setError(
        si.pass,
        'signinPasswordError',
        !pass ? 'Enter your password.' : ''
      );

      if (!okE || !okP) return;

      const button = $('#signinForm').querySelector('[type="submit"]');
      if (button) button.disabled = true;

      try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email,
          password: pass
        });

        if (error) throw error;

        const user = data.user;

        setMessage(
          'signinMessage',
          'Signed in successfully. Checking your account role...',
          'ok'
        );

        await startSession(user);
      } catch (error) {
        setMessage(
          'signinMessage',
          error.message || 'Unable to sign in. Check your email and password.',
          'error'
        );
      } finally {
        if (button) button.disabled = false;
      }
    });

    // CREATE ACCOUNT - SUPABASE AUTH
    const su = {
      first: $('#signupFirst'),
      last: $('#signupLast'),
      email: $('#signupEmail'),
      pass: $('#signupPassword'),
      terms: $('#signupTerms')
    };

    $('#signupForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      setMessage('signupMessage', '');

      const first = su.first.value.trim();
      const last = su.last.value.trim();
      const email = su.email.value.trim().toLowerCase();
      const pass = su.pass.value;

      const ok = [
        setError(su.first, 'signupFirstError', first ? '' : 'Enter a first name.'),
        setError(su.last, 'signupLastError', last ? '' : 'Enter a last name.'),
        setError(su.email, 'signupEmailError', !email ? 'Enter your email address.' : !EMAIL_RE.test(email) ? 'Enter a valid email address.' : ''),
        setError(su.pass, 'signupPasswordError', !pass ? 'Create a password.' : pass.length < 8 ? 'Use at least 8 characters.' : ''),
        setError(null, 'signupTermsError', su.terms.checked ? '' : 'Please agree to the Terms of Service and Privacy Policy.')
      ].every(Boolean);

      if (!ok) return;

      const button = $('#signupForm').querySelector('[type="submit"]');
      if (button) button.disabled = true;

      try {
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password: pass,
          options: {
            // Return to this site's login page after email confirmation.
            emailRedirectTo: new URL('email-confirmed.html', window.location.href).toString(),
            data: {
              first_name: first,
              last_name: last,
              full_name: `${first} ${last}`
            }
          }
        });

        if (error) throw error;

        // Email confirmation must be completed before the user can sign in.
        // Do not create the application's local session or redirect to a dashboard here.
        if (data.session) {
          await supabaseClient.auth.signOut();
        }

        setMessage(
          'signupMessage',
          'Account created! Please check your email, confirm your account, then sign in here.',
          'ok'
        );
      } catch (error) {
        setMessage(
          'signupMessage',
          error.message || 'Unable to create your account. Please try again.',
          'error'
        );
      } finally {
        if (button) button.disabled = false;
      }
    });

    clearOnInput();

    $('#forgotLink').addEventListener('click', (e) => {
      e.preventDefault();

      const email = si.email.value.trim();
      const valid = EMAIL_RE.test(email);

      setMessage(
        'signinMessage',
        valid ? `If an account exists for ${email}, we'll send a reset link.` : 'Enter your email above, then select Forgot password.',
        valid ? 'ok' : 'error'
      );
    });

    // SOCIAL SIGN-IN - GOOGLE AND FACEBOOK THROUGH SUPABASE AUTH
    $$('.btn-social').forEach((button) => {
      button.addEventListener('click', async () => {
        const messageId = panels.signin.hidden
          ? 'signupMessage'
          : 'signinMessage';

        // Read the provider from data-provider first. The text fallback
        // also supports buttons that do not yet have a data-provider value.
        const providerLabel = String(
          button.dataset.provider ||
          button.getAttribute('aria-label') ||
          button.textContent ||
          ''
        ).toLowerCase();

        const provider = providerLabel.includes('facebook')
          ? 'facebook'
          : providerLabel.includes('google')
            ? 'google'
            : '';

        if (!provider) {
          setMessage(
            messageId,
            'Unable to identify this sign-in provider. Check the button data-provider in index.html.',
            'error'
          );
          return;
        }

        button.disabled = true;
        setMessage(
          messageId,
          `Connecting to ${provider === 'facebook' ? 'Facebook' : 'Google'}...`,
          'ok'
        );

        try {
          const { error } = await supabaseClient.auth.signInWithOAuth({
            provider,
            options: {
              redirectTo: new URL('index.html', window.location.href).toString()
            }
          });

          if (error) throw error;
        } catch (error) {
          console.error(`${provider} OAuth error:`, error);

          setMessage(
            messageId,
            error.message || `Unable to start ${provider} sign-in. Please try again.`,
            'error'
          );

          button.disabled = false;
        }
      });
    });

    // COMPLETE GOOGLE OR FACEBOOK OAUTH CALLBACK
    // Supabase JS automatically exchanges the returned OAuth code for a session.
    async function completeOAuthCallback() {
      const queryParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(
        window.location.hash.startsWith('#')
          ? window.location.hash.slice(1)
          : window.location.hash
      );

      // FIXED: callbackError and isOAuthCallback are separate declarations.
      const callbackError =
        queryParams.get('error_description') ||
        queryParams.get('error') ||
        hashParams.get('error_description') ||
        hashParams.get('error');

      const isOAuthCallback =
        queryParams.has('code') ||
        queryParams.has('error') ||
        hashParams.has('access_token') ||
        hashParams.has('error');

      if (!isOAuthCallback) return;

      if (callbackError) {
        setMessage('signinMessage', callbackError, 'error');
        return;
      }

      try {
        // getSession() waits for the Supabase client to finish processing
        // the callback URL and exchanging its authorization code.
        const { data, error } = await supabaseClient.auth.getSession();

        if (error) throw error;

        const session = data.session;

        if (!session || !session.user) {
          throw new Error(
            'Social sign-in returned without an active session. Please try again.'
          );
        }

        const user = session.user;

        // Remove OAuth callback parameters before leaving the login page.
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        // Read the profile role from Supabase and redirect to the correct page.
        await startSession(user);
      } catch (error) {
        console.error('Social OAuth callback error:', error);

        setMessage(
          'signinMessage',
          error.message || 'Unable to complete social sign-in. Please try again.',
          'error'
        );
      }
    }

    // Handles callbacks from both Google and Facebook.
    completeOAuthCallback();
  }


  /* =========================================================
     BOOK A JOURNEY  (book.html)
     ========================================================= */
  function attachSuggest(input, onChange) {
    const list = document.createElement('ul');
    list.className = 'suggest';
    list.hidden = true;
    list.setAttribute('role', 'listbox');
    input.parentElement.appendChild(list);

    const pick = (code) => {
      input.value = label(byCode(code));
      list.hidden = true;
      onChange();
    };

    const show = () => {
      const q = norm(input.value);
      const items = STATIONS.filter((s) =>
        !q || norm(label(s)).includes(q) || norm(s.code).includes(q)
      );

      list.innerHTML = items.map((s) =>
        `<li role="option" data-code="${s.code}"><span class="code">${s.code}</span>${esc(label(s))}</li>`
      ).join('') || '<li class="empty">No matching station</li>';

      list.hidden = false;
    };

    input.addEventListener('focus', show);
    input.addEventListener('input', () => {
      show();
      onChange();
    });

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
        if (first) {
          e.preventDefault();
          pick(first.dataset.code);
        }
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
    const fromIn = $('#fromInput');
    const toIn = $('#toInput');
    const dateIn = $('#dateInput');
    const retIn = $('#returnInput');
    const retField = $('#returnField');
    const pax = $('#paxSelect');
    const btn = $('#searchBtn');
    const hint = $('#searchHint');

    let trip = 'oneway';

    for (let i = 1; i <= 9; i++) {
      pax.add(new Option(`${i} passenger${i > 1 ? 's' : ''}`, i));
    }

    dateIn.min = retIn.min = todayISO();
    dateIn.value = todayISO();

    const params = new URLSearchParams(location.search);
    if (byCode(params.get('from'))) fromIn.value = label(byCode(params.get('from')));
    if (byCode(params.get('to'))) toIn.value = label(byCode(params.get('to')));

    function validate() {
      const a = findStation(fromIn.value);
      const b = findStation(toIn.value);
      const today = todayISO();

      let msg = '';

      if (a && b && a.code === b.code) {
        msg = 'Departure and destination must be different stations.';
      } else if (dateIn.value && dateIn.value < today) {
        msg = 'Choose a travel date from today onwards.';
      } else if (trip === 'round' && retIn.value && retIn.value < dateIn.value) {
        msg = 'Return date can’t be before the outbound date.';
      }

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
        from: findStation(fromIn.value).code,
        to: findStation(toIn.value).code,
        date: dateIn.value,
        pax: pax.value,
        trip,
      });

      if (trip === 'round') q.set('return', retIn.value);

      location.href = 'results.html?' + q.toString();
    });

    validate();
  }


  /* =========================================================
     TRAIN RESULTS  (results.html)
     Train options are loaded from Supabase trains + train_stops.
     ========================================================= */

  const SVC_ICON = {
    wifi: ['\uD83D\uDCF6', 'Wi-Fi'],
    power: ['\uD83D\uDD0C', 'Power sockets'],
    cafe: ['\u2615', 'Café'],
    bike: ['\uD83D\uDEB2', 'Bike space'],
    quiet: ['\uD83D\uDD07', 'Quiet coach'],
    sleeper: ['\uD83D\uDECF\uFE0F', 'Sleeper berths']
  };

  const durText = (m) => `${Math.floor(m / 60)}h ${m % 60}m`;

  function timeToMinutes(value) {
    if (!value) return null;

    const parts = String(value).slice(0, 5).split(':').map(Number);

    if (parts.length !== 2 || parts.some((n) => !Number.isFinite(n))) {
      return null;
    }

    return parts[0] * 60 + parts[1];
  }

  function timeLabel(value) {
    return value ? String(value).slice(0, 5) : '--:--';
  }


  // LOAD TRAIN SERVICES FROM SUPABASE
  async function loadRouteServices(fromCode, toCode) {
    const [trainsResult, stopsResult, stationsResult] = await Promise.all([
      supabaseClient
        .from('trains')
        .select('train_id, train_code, train_name, train_type, total_seats')
        .eq('is_active', true),

      supabaseClient
        .from('train_stops')
        .select('train_id, station_id, stop_order, arrival_time, departure_time, fare_from_previous')
        .order('train_id', { ascending: true })
        .order('stop_order', { ascending: true }),

      supabaseClient
        .from('stations')
        .select('station_id, station_code, station_name, city, province')
        .eq('is_active', true)
    ]);

    if (trainsResult.error) throw trainsResult.error;
    if (stopsResult.error) throw stopsResult.error;
    if (stationsResult.error) throw stationsResult.error;

    const trains = trainsResult.data || [];
    const stops = stopsResult.data || [];

    const stationById = new Map(
      (stationsResult.data || []).map((station) => [
        station.station_id,
        station
      ])
    );

    const stopsByTrain = new Map();

    stops.forEach((stop) => {
      const station = stationById.get(stop.station_id);
      if (!station) return;

      if (!stopsByTrain.has(stop.train_id)) {
        stopsByTrain.set(stop.train_id, []);
      }

      stopsByTrain.get(stop.train_id).push({
        ...stop,
        station_code: station.station_code,
        station_name: station.station_name,
        city: station.city || station.province || ''
      });
    });

    const results = [];

    trains.forEach((train) => {
      const route = (stopsByTrain.get(train.train_id) || [])
        .sort((a, b) => Number(a.stop_order) - Number(b.stop_order));

      const fromIndex = route.findIndex(
        (stop) => stop.station_code === fromCode
      );

      const toIndex = route.findIndex(
        (stop) => stop.station_code === toCode
      );

      // Both stations must be on the train route.
      // Destination must come after departure.
      if (fromIndex < 0 || toIndex <= fromIndex) return;

      const originStop = route[fromIndex];
      const destinationStop = route[toIndex];

      const dep = timeLabel(originStop.departure_time);
      const arr = timeLabel(destinationStop.arrival_time);

      const depMinutes = timeToMinutes(originStop.departure_time);
      let arrMinutes = timeToMinutes(destinationStop.arrival_time);

      if (
        depMinutes === null ||
        arrMinutes === null ||
        dep === '--:--' ||
        arr === '--:--'
      ) {
        return;
      }

      // Handle journeys that arrive after midnight.
      if (arrMinutes < depMinutes) {
        arrMinutes += 24 * 60;
      }

      const routeSegment = route.slice(fromIndex, toIndex + 1);

      const fare = routeSegment.slice(1).reduce(
        (total, stop) =>
          total + Number(stop.fare_from_previous || 0),
        0
      );

      const intermediateStops = routeSegment
        .slice(1, -1)
        .map((stop) => stop.station_name);

      results.push({
        id: train.train_code,
        op: train.train_name,
        type: train.train_type || 'Train',
        totalSeats: Number(train.total_seats || 0),
        dep,
        arr,
        durMin: arrMinutes - depMinutes,
        changes: 0,
        via: intermediateStops.join(' → '),
        intermediateStops,
        price: fare,
        // Platform, live delay and amenities are not in the current schema.
        plat: null,
        late: null,
        amen: []
      });
    });

    return results;
  }


  // TRAIN RESULTS PAGE
  async function initResults() {
    const p = new URLSearchParams(location.search);

    const from = byCode(p.get('from')) || STATIONS[0];
    const to = byCode(p.get('to')) || STATIONS[1];

    const date = /^\d{4}-\d{2}-\d{2}$/.test(p.get('date') || '')
      ? p.get('date')
      : todayISO();

    const pax = Math.min(
      9,
      Math.max(1, parseInt(p.get('pax'), 10) || 1)
    );

    const ret = p.get('return');

    $('#routeTitle').innerHTML =
      `${esc(from.name)} <i>to</i> ${esc(to.name)}`;

    $('#routeMeta').textContent =
      `${fmtDate(date)} · ${pax} passenger${pax > 1 ? 's' : ''}${ret ? ` · Return ${fmtDate(ret)}` : ''}`;

    $('#modifyBtn').href =
      `book.html?from=${encodeURIComponent(from.code)}&to=${encodeURIComponent(to.code)}`;

    const list = $('#serviceList');
    const count = $('#resultCount');
    const modal = $('#selectModal');

    let services = [];


    function render() {
      const changesInput = $('input[name="changes"]:checked');
      const sortInput = $('input[name="sort"]:checked');

      const changes = changesInput ? changesInput.value : 'all';
      const sort = sortInput ? sortInput.value : 'dep';

      let rows = services.filter((service) =>
        changes === 'all' ||
        (changes === 'direct'
          ? service.changes === 0
          : service.changes === 1)
      );

      rows = [...rows].sort((a, b) => {
        if (sort === 'price') return a.price - b.price;
        if (sort === 'fast') return a.durMin - b.durMin;
        return a.dep.localeCompare(b.dep);
      });

      count.textContent =
        `${rows.length} service${rows.length === 1 ? '' : 's'} found`;

      if (!rows.length) {
        list.innerHTML = changes === 'one'
          ? '<div class="empty-state">No connecting services are configured for this route yet. Try “All services”.</div>'
          : '<div class="empty-state">No trains are scheduled for this route on the selected direction. Try another route.</div>';

        return;
      }

      list.innerHTML = rows.map((service) => {
        const serviceIndex = services.indexOf(service);

        const icons = service.amen.map((key) => {
          const item = SVC_ICON[key];
          return item
            ? `<span title="${item[1]}">${item[0]}</span>`
            : '';
        }).join('');

        const intermediateText = service.intermediateStops.length
          ? service.intermediateStops.map(esc).join(' → ')
          : 'No intermediate stops';

        return `
        <article class="svc" data-i="${serviceIndex}">
          <div class="svc-main">
            <div class="svc-time">
              ${service.dep}
              <small>${esc(from.name)}</small>
            </div>

            <div class="svc-line">
              ${durText(service.durMin)}
              <div class="bar direct"></div>
              Direct
            </div>

            <div class="svc-time">
              ${service.arr}
              <small>${esc(to.name)}</small>
            </div>

            <div class="svc-buy">
              <small>from</small>
              <strong>${peso(service.price)}</strong>
              <button class="btn-select" data-select="${serviceIndex}">
                Select
              </button>
            </div>
          </div>

          <div class="svc-foot">
            <span>${esc(service.id)} · ${esc(service.op)}</span>
            <span class="plat">${esc(service.type)}</span>
            <span class="st-ok">● Scheduled</span>
            ${icons ? `<span class="amen">${icons}</span>` : ''}
            <button
              class="details-btn"
              data-details="${serviceIndex}"
              aria-expanded="false">
              Details
            </button>
          </div>

          <div class="svc-details" hidden>
            <div>
              <b>Route:</b>
              ${esc(label(from))} → ${intermediateText} → ${esc(label(to))}
            </div>
            <div>
              <b>Journey time:</b>
              ${durText(service.durMin)} · Direct service
            </div>
            <div><b>Train type:</b> ${esc(service.type)}</div>
            <div><b>Passenger capacity:</b> ${service.totalSeats} seats</div>
            <div><b>Fare:</b> ${peso(service.price)} per passenger</div>
          </div>
        </article>`;
      }).join('');
    }


    $$('input[name="changes"], input[name="sort"]').forEach((radio) => {
      radio.addEventListener('change', render);
    });


    list.addEventListener('click', (e) => {
      const detailsButton = e.target.closest('[data-details]');

      if (detailsButton) {
        const box = detailsButton
          .closest('.svc')
          .querySelector('.svc-details');

        box.hidden = !box.hidden;
        detailsButton.setAttribute(
          'aria-expanded',
          String(!box.hidden)
        );

        return;
      }

      const selectButton = e.target.closest('[data-select]');

      if (selectButton) {
        const selected = services[Number(selectButton.dataset.select)];
        if (selected) openModal(selected);
      }
    });


    // Preview only. Booking creation is not connected yet.
    async function openModal(service) {
      const total = service.price * pax;

      let passengerDetails = Array.from(
        { length: pax },
        () => ({
          full_name: '',
          age: null,
          passenger_type: 'adult'
        })
      );

      let availableSeats = [];
      let selectedCoach = null;
      let selectedSeatCodes = [];


      // =================================================
      // STEP 1: PASSENGER DETAILS
      // =================================================

      function renderPassengerStep() {
        const fields = passengerDetails.map((person, i) => `
          <div class="card" style="padding:16px;margin-bottom:12px;">
            <h3>Passenger ${i + 1}</h3>

            <div class="field">
              <label class="lbl">Full name</label>
              <input
                class="inp"
                data-passenger-name
                maxlength="150"
                value="${esc(person.full_name)}"
                placeholder="Enter full name"
                required
              >
            </div>

            <div class="two-col">
              <div class="field">
                <label class="lbl">Age</label>
                <input
                  class="inp"
                  data-passenger-age
                  type="number"
                  min="0"
                  max="120"
                  value="${person.age ?? ''}"
                  placeholder="Optional"
                >
              </div>

              <div class="field">
                <label class="lbl">Passenger type</label>
                <select class="inp" data-passenger-type>
                  <option value="adult" ${person.passenger_type === 'adult' ? 'selected' : ''}>Adult</option>
                  <option value="child" ${person.passenger_type === 'child' ? 'selected' : ''}>Child</option>
                  <option value="senior" ${person.passenger_type === 'senior' ? 'selected' : ''}>Senior</option>
                </select>
              </div>
            </div>
          </div>
        `).join('');

        modal.hidden = false;

        modal.innerHTML = `
          <div class="modal-box" role="dialog" aria-modal="true">
            <h2>Passenger Details</h2>

            <p class="muted">
              Enter the details of everyone travelling.
            </p>

            <div class="modal-rows">
              <div>
                <span>Route</span>
                <b>${esc(from.name)} → ${esc(to.name)}</b>
              </div>
              <div>
                <span>Date</span>
                <b>${esc(fmtShort(date))}</b>
              </div>
              <div>
                <span>Train</span>
                <b>${esc(service.id)}</b>
              </div>
              <div>
                <span>Passengers</span>
                <b>${pax}</b>
              </div>
              <div>
                <span>Estimated fare</span>
                <b>${peso(total)}</b>
              </div>
            </div>

            <form id="passengerBookingForm">
              ${fields}

              <p id="bookingStatus" class="muted"
                 role="status" aria-live="polite"></p>

              <div class="modal-actions">
                <button type="button" class="btn-outline" id="mBack">
                  Back
                </button>

                <button type="submit" class="btn-gold" id="checkSeats">
                  Continue to seats
                </button>
              </div>
            </form>
          </div>
        `;

        $('#mBack').addEventListener('click', closeModal);

        $('#passengerBookingForm').addEventListener('submit', async (e) => {
          e.preventDefault();

          const names = $$('[data-passenger-name]', e.currentTarget);
          const ages = $$('[data-passenger-age]', e.currentTarget);
          const types = $$('[data-passenger-type]', e.currentTarget);

          const nextPassengers = [];

          for (let i = 0; i < pax; i++) {
            const fullName = names[i].value.trim();
            const ageRaw = ages[i].value.trim();

            if (!fullName || fullName.length > 150) {
              $('#bookingStatus').textContent =
                `Enter a valid full name for Passenger ${i + 1}.`;
              names[i].focus();
              return;
            }

            let age = null;

            if (ageRaw !== '') {
              age = Number(ageRaw);

              if (!Number.isInteger(age) || age < 0 || age > 120) {
                $('#bookingStatus').textContent =
                  `Enter a valid age for Passenger ${i + 1}.`;
                ages[i].focus();
                return;
              }
            }

            nextPassengers.push({
              full_name: fullName,
              age,
              passenger_type: types[i].value
            });
          }

          passengerDetails = nextPassengers;

          const button = $('#checkSeats');
          button.disabled = true;
          button.textContent = 'Checking available seats...';

          try {
            await loadAvailableSeats();
          } catch (error) {
            console.error('Seat loading error:', error);

            $('#bookingStatus').textContent =
              error.message || 'Unable to load available seats.';

            button.disabled = false;
            button.textContent = 'Try again';
          }
        });
      }


      // =================================================
      // STEP 2: LOAD AVAILABLE SEATS FROM SUPABASE
      // =================================================

      async function loadAvailableSeats() {
        const { data: sessionData, error: sessionError } =
          await supabaseClient.auth.getSession();

        if (sessionError) throw sessionError;

        if (!sessionData.session) {
          throw new Error('Please sign in before selecting seats.');
        }

        const { data, error } = await supabaseClient.rpc(
          'get_available_seats',
          {
            p_train_code: service.id,
            p_departure_code: from.code,
            p_arrival_code: to.code,
            p_travel_date: date
          }
        );

        if (error) throw error;

        availableSeats = Array.isArray(data) ? data : [];

        if (availableSeats.length === 0) {
          throw new Error('No seats are available for this service.');
        }

        selectedSeatCodes = [];

        const coaches = [
          ...new Set(availableSeats.map((s) => s.coach_code))
        ].sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true })
        );

        selectedCoach = coaches[0];

        renderSeatStep();
      }


      // =================================================
      // STEP 3: VISUAL SEAT MAP
      // =================================================

      function renderSeatStep() {
        const coaches = [
          ...new Set(availableSeats.map((s) => s.coach_code))
        ].sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true })
        );

        const seats = availableSeats
          .filter((s) => s.coach_code === selectedCoach)
          .sort((a, b) =>
            a.seat_number.localeCompare(
              b.seat_number,
              undefined,
              { numeric: true }
            )
          );

        const coachButtons = coaches.map((coach) => `
          <button
            type="button"
            data-coach="${esc(coach)}"
            class="btn-outline"
            style="
              height:38px;
              padding:0 15px;
              background:${selectedCoach === coach ? '#14234f' : '#fff'};
              color:${selectedCoach === coach ? '#fff' : '#14234f'};
            "
          >
            ${esc(coach)}
          </button>
        `).join('');

        const seatButtons = seats.map((seat) => {
          const code = `${seat.coach_code}-${seat.seat_number}`;
          const selected = selectedSeatCodes.includes(code);
          const available = seat.is_available;

          let background = '#e8f6ee';
          let border = '#bfe3cd';
          let color = '#1d7a46';

          if (!available) {
            background = '#e5e5e5';
            border = '#ccc';
            color = '#888';
          } else if (selected) {
            background = '#c9831b';
            border = '#c9831b';
            color = '#fff';
          }

          return `
            <button
              type="button"
              data-seat="${esc(code)}"
              ${available ? '' : 'disabled'}
              aria-pressed="${selected}"
              title="${available ? 'Available' : 'Occupied'}"
              style="
                width:100%;
                min-height:44px;
                border:1px solid ${border};
                border-radius:8px;
                background:${background};
                color:${color};
                font-weight:700;
                cursor:${available ? 'pointer' : 'not-allowed'};
                opacity:${available ? '1' : '.65'};
              "
            >
              ${esc(seat.seat_number)}
            </button>
          `;
        }).join('');

        const remaining = pax - selectedSeatCodes.length;

        const passengerPreview = selectedSeatCodes.map((seat, i) => `
          <div style="
            display:flex;
            justify-content:space-between;
            padding:7px 0;
            border-bottom:1px solid #ddd7ca;
          ">
            <span>${esc(passengerDetails[i].full_name)}</span>
            <b>${esc(seat)}</b>
          </div>
        `).join('');

        modal.innerHTML = `
          <div class="modal-box" role="dialog" aria-modal="true">

            <h2>Select Your Seats</h2>

            <p class="muted">
              Choose ${pax} available seat${pax > 1 ? 's' : ''}
              for ${esc(service.id)}.
            </p>

            <div class="modal-rows">
              <div>
                <span>Route</span>
                <b>${esc(from.name)} → ${esc(to.name)}</b>
              </div>

              <div>
                <span>Travel date</span>
                <b>${esc(fmtShort(date))}</b>
              </div>
            </div>

            <h3 style="margin:18px 0 10px;">Choose coach</h3>

            <div style="
              display:flex;
              flex-wrap:wrap;
              gap:8px;
              margin-bottom:18px;
            ">
              ${coachButtons}
            </div>

            <div style="
              background:#f3f1ec;
              border-radius:10px;
              padding:18px;
            ">
              <h3 style="text-align:center;margin-bottom:12px;">
                Coach ${esc(selectedCoach)}
              </h3>

              <div style="
                display:grid;
                grid-template-columns:repeat(4,minmax(0,1fr));
                gap:9px;
                max-width:360px;
                margin:auto;
              ">
                ${seatButtons}
              </div>
            </div>

            <div style="
              display:flex;
              gap:14px;
              flex-wrap:wrap;
              margin:16px 0;
              font-size:12px;
            ">
              <span>🟢 Available</span>
              <span>🟠 Selected</span>
              <span>⚪ Occupied</span>
            </div>

            <h3>Selected seats (${selectedSeatCodes.length}/${pax})</h3>

            <div style="margin:8px 0 14px;">
              ${passengerPreview ||
                '<p class="muted">No seats selected yet.</p>'}
            </div>

            <p id="seatStatus" class="muted" role="status">
              ${
                remaining > 0
                  ? `Select ${remaining} more seat${remaining > 1 ? 's' : ''}.`
                  : 'All passengers have a selected seat.'
              }
            </p>

            <div class="modal-actions">
              <button type="button" class="btn-outline" id="backToPassengers">
                Back
              </button>

              <button
                type="button"
                class="btn-gold"
                id="confirmWithSeats"
                ${remaining > 0 ? 'disabled' : ''}
              >
                Confirm booking
              </button>
            </div>

          </div>
        `;


        // Switch coach
        $$('[data-coach]', modal).forEach((button) => {
          button.addEventListener('click', () => {
            selectedCoach = button.dataset.coach;
            renderSeatStep();
          });
        });


        // Select or deselect seats
        $$('[data-seat]', modal).forEach((button) => {
          button.addEventListener('click', () => {
            const code = button.dataset.seat;
            const existing = selectedSeatCodes.indexOf(code);

            if (existing >= 0) {
              selectedSeatCodes.splice(existing, 1);
            } else {
              if (selectedSeatCodes.length >= pax) {
                $('#seatStatus').textContent =
                  `You can only select ${pax} seats.`;
                return;
              }

              selectedSeatCodes.push(code);
            }

            renderSeatStep();
          });
        });


        // Back to passenger details
        $('#backToPassengers').addEventListener('click', () => {
          renderPassengerStep();
        });

        // Final booking confirmation
        $('#confirmWithSeats').addEventListener('click', saveBookingWithSeats);
      }


      // =================================================
      // STEP 4: SAVE BOOKING + PASSENGERS + SEATS
      // =================================================

      async function saveBookingWithSeats() {
        if (selectedSeatCodes.length !== pax) return;

        const confirmButton = $('#confirmWithSeats');
        const status = $('#seatStatus');

        confirmButton.disabled = true;
        confirmButton.textContent = 'Saving booking...';
        status.textContent = 'Saving booking and seat assignments...';

        try {
          const assignedPassengers = passengerDetails.map(
            (person, i) => ({
              ...person,
              seat_number: selectedSeatCodes[i]
            })
          );

          const { data, error } = await supabaseClient.rpc(
            'create_booking_with_seats',
            {
              p_train_code: service.id,
              p_departure_code: from.code,
              p_arrival_code: to.code,
              p_travel_date: date,
              p_total_passengers: pax,
              p_passengers: assignedPassengers
            }
          );

          if (error) throw error;

          if (!data || !data.booking_reference) {
            throw new Error('Booking was not saved successfully.');
          }


          // Display successful booking
          const savedPassengers = Array.isArray(data.passengers)
            ? data.passengers
            : assignedPassengers;

          modal.innerHTML = `
            <div class="modal-box" role="dialog" aria-modal="true">

              <h2>Booking confirmed!</h2>

              <p class="muted">
                Your booking, passengers and seat assignments
                were saved successfully.
              </p>

              <div class="ref-big">
                ${esc(data.booking_reference)}
              </div>

              <div class="modal-rows">
                <div>
                  <span>Train</span>
                  <b>${esc(data.train_code)}</b>
                </div>

                <div>
                  <span>Departure</span>
                  <b>${esc(data.departure_time)}</b>
                </div>

                <div>
                  <span>Arrival</span>
                  <b>${esc(data.arrival_time)}</b>
                </div>

                <div>
                  <span>Passengers</span>
                  <b>${data.total_passengers}</b>
                </div>

                <div>
                  <span>Total fare</span>
                  <b>${peso(data.total_fare)}</b>
                </div>

                <div>
                  <span>Status</span>
                  <b>${esc(data.booking_status)}</b>
                </div>
              </div>

              <h3>Passenger seat assignments</h3>

              <div style="margin:12px 0;">
                ${savedPassengers.map((person) => `
                  <div style="
                    display:flex;
                    justify-content:space-between;
                    gap:10px;
                    padding:9px 0;
                    border-bottom:1px solid #ddd7ca;
                  ">
                    <span>
                      ${esc(person.full_name)}
                      <small>(${esc(person.passenger_type)})</small>
                    </span>

                    <b>${esc(person.seat_number)}</b>
                  </div>
                `).join('')}
              </div>

              <p class="muted">
                Keep your booking reference for future access.
              </p>

              <p class="muted">
                Payment processing is not yet connected.
              </p>

              <div class="modal-actions">
                <a href="manage.html" class="btn-gold">
                  Manage Booking
                </a>
              </div>

            </div>
          `;

        } catch (error) {
          console.error('Seat booking error:', error);

          status.textContent =
            error.message || 'Unable to save your booking.';

          confirmButton.disabled = false;
          confirmButton.textContent = 'Try again';

          // Refresh available seats if another customer
          // has already taken a selected seat.
          let refresh = $('#refreshSeats', modal);

          if (!refresh) {
            refresh = document.createElement('button');
            refresh.id = 'refreshSeats';
            refresh.className = 'btn-outline';
            refresh.type = 'button';
            refresh.textContent = 'Refresh seat availability';

            confirmButton.parentElement.appendChild(refresh);

            refresh.addEventListener('click', async () => {
              refresh.disabled = true;
              refresh.textContent = 'Refreshing...';

              try {
                await loadAvailableSeats();
              } catch (refreshError) {
                console.error(refreshError);
                status.textContent = refreshError.message;
                refresh.disabled = false;
                refresh.textContent = 'Refresh seat availability';
              }
            });
          }
        }
      }


      // Start passenger form
      renderPassengerStep();
    }

    function closeModal() {
      modal.hidden = true;
      modal.innerHTML = '';
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hidden) {
        closeModal();
      }
    });


    count.textContent = 'Loading train schedules from Supabase…';
    list.innerHTML = '<div class="empty-state">Loading available trains…</div>';

    try {
      services = await loadRouteServices(from.code, to.code);
      render();
    } catch (error) {
      console.error('Could not load train schedules from Supabase:', error);

      count.textContent = 'Unable to load train schedules';
      list.innerHTML =
        `<div class="empty-state">Could not load train schedules. ${esc(error.message || 'Please check your Supabase connection and table permissions, then refresh.')}</div>`;
    }
  }


  /* =========================================================
     MANAGE BOOKING  (manage.html)
     ========================================================= */
  async function initManage() {
    const find = $('#manageFind');
    const view = $('#manageView');
    const form = $('#manageForm');

    const refIn = $('#mgRef');
    const emailIn = $('#mgEmail');

    const newDate = $('#newDate');
    const dateBtn = $('#dateBtn');
    const dateNotice = $('#dateNotice');

    const upBtn = $('#upBtn');
    const upNotice = $('#upNotice');

    let booking = null;
    let chosenClass = null;

    // A confirmed booking can be managed until its scheduled departure.
    // This allows same-day bookings as long as the train has not departed.
    function bookingHasNotDeparted() {
      if (!booking || !booking.travel_date || !booking.departure_time) {
        return false;
      }

      const departureTime = String(booking.departure_time).slice(0, 5);

      if (!/^\d{2}:\d{2}$/.test(departureTime)) {
        return false;
      }

      const departureDateTime = new Date(
        `${booking.travel_date}T${departureTime}:00`
      );

      return (
        !Number.isNaN(departureDateTime.getTime()) &&
        departureDateTime.getTime() > Date.now()
      );
    }

    // Display messages
    const message = document.createElement('p');
    message.id = 'manageMessage';
    message.className = 'notice';
    message.setAttribute('role', 'status');
    form.appendChild(message);

    function showMessage(text, type = 'info') {
      message.className = `notice notice-${type}`;
      message.textContent = text;
    }

    // Display booking information
    function paintCard() {
      if (!booking) return;

      $('#bcRoute').textContent =
        `${booking.departureName} → ${booking.arrivalName}`;

      $('#bcDate').textContent =
        `${fmtDate(booking.travel_date)} · ${booking.departure_time} → ${booking.arrival_time}`;

      $('#bcRef').textContent =
        booking.booking_reference;

      $('#bcPassenger').innerHTML =
        booking.passengers.map(p =>
          `${esc(p.full_name)} (${esc(p.passenger_type)})`
        ).join('<br>') ||
        `${booking.total_passengers} passenger(s)`;

      $('#bcTrain').textContent =
        `${booking.train_code} · ${booking.train_name}`;

      $('#bcClass').textContent =
        booking.booking_class || booking.train_type || 'Not assigned';

      $('#bcSeat').innerHTML =
        booking.passengers.map(p =>
          esc(p.seat_number || 'Not assigned')
        ).join('<br>') || 'Not assigned';

      const status = $('.bc-tag');

      if (status) {
        status.textContent =
          String(booking.booking_status).toUpperCase();
      }

      $('#curDate').textContent =
        fmtDate(booking.travel_date);
    }


    // Open booking management panels
    function openPanel(name) {
      $$('.tile', view).forEach(tile => {
        const active = tile.dataset.action === name;

        tile.classList.toggle('is-active', active);

        tile.setAttribute(
          'aria-pressed',
          String(active)
        );
      });

      $$('[data-panel]', view).forEach(panel => {
        panel.hidden = panel.dataset.panel !== name;
      });

      if (name) {
        $(`[data-panel="${name}"]`).scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }


    // FIND BOOKING
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      message.textContent = '';

      const reference =
        refIn.value.trim().toUpperCase();

      const email =
        emailIn.value.trim().toLowerCase();

      const okR = setError(
        refIn,
        'mgRefError',
        reference ? '' : 'Enter your booking reference.'
      );

      const okE = setError(
        emailIn,
        'mgEmailError',
        !email
          ? 'Enter your booking email.'
          : !EMAIL_RE.test(email)
            ? 'Enter a valid email address.'
            : ''
      );

      if (!okR || !okE) return;

      const button = form.querySelector('[type="submit"]');

      button.disabled = true;
      button.textContent = 'Searching...';

      try {
        // Verify authenticated user
        const { data: authData, error: authError } =
          await supabaseClient.auth.getUser();

        if (authError) throw authError;

        const user = authData.user;

        if (!user) {
          throw new Error('Please sign in first.');
        }

        if (user.email.toLowerCase() !== email) {
          throw new Error(
            'Email does not match your signed-in account.'
          );
        }

        // Retrieve booking
        const { data: bookingData, error: bookingError } =
          await supabaseClient
            .from('bookings')
            .select('*')
            .eq('booking_reference', reference)
            .eq('user_id', user.id)
            .maybeSingle();

        if (bookingError) throw bookingError;

        if (!bookingData) {
          throw new Error(
            'No booking found for this reference and account.'
          );
        }

        // Retrieve train, stations and passenger links
        const [
          trainResult,
          departureResult,
          arrivalResult,
          linksResult
        ] = await Promise.all([
          supabaseClient
            .from('trains')
            .select('train_code, train_name, train_type')
            .eq('train_id', bookingData.train_id)
            .maybeSingle(),

          supabaseClient
            .from('stations')
            .select('station_name')
            .eq(
              'station_id',
              bookingData.departure_station_id
            )
            .maybeSingle(),

          supabaseClient
            .from('stations')
            .select('station_name')
            .eq(
              'station_id',
              bookingData.arrival_station_id
            )
            .maybeSingle(),

          supabaseClient
            .from('booking_passengers')
            .select('passenger_id, seat_number')
            .eq('booking_id', bookingData.booking_id)
        ]);

        if (trainResult.error) throw trainResult.error;
        if (departureResult.error) throw departureResult.error;
        if (arrivalResult.error) throw arrivalResult.error;
        if (linksResult.error) throw linksResult.error;

        if (
          !trainResult.data ||
          !departureResult.data ||
          !arrivalResult.data
        ) {
          throw new Error(
            'Some booking details could not be found.'
          );
        }

        // Retrieve passengers
        const links = linksResult.data || [];

        let passengers = [];

        if (links.length > 0) {
          const passengerIds =
            links.map(x => x.passenger_id);

          const { data: people, error: peopleError } =
            await supabaseClient
              .from('passengers')
              .select(
                'passenger_id, full_name, age, passenger_type'
              )
              .in('passenger_id', passengerIds)
              .eq('user_id', user.id);

          if (peopleError) throw peopleError;

          const peopleById = new Map(
            (people || []).map(person => [
              person.passenger_id,
              person
            ])
          );

          passengers = links.map(link => {
            const person =
              peopleById.get(link.passenger_id);

            return person
              ? {
                  ...person,
                  seat_number: link.seat_number
                }
              : null;

          }).filter(Boolean);
        }

        // Store actual database booking
        booking = {
          ...bookingData,

          train_code: trainResult.data.train_code,
          train_name: trainResult.data.train_name,
          train_type: trainResult.data.train_type,

          departureName:
            departureResult.data.station_name,

          arrivalName:
            arrivalResult.data.station_name,

          departure_time:
            String(bookingData.departure_time).slice(0, 5),

          arrival_time:
            String(bookingData.arrival_time).slice(0, 5),

          booking_class:
            bookingData.booking_class || 'Standard',

          passengers
        };

        paintCard();

        find.hidden = true;
        view.hidden = false;

        openPanel(null);

        // Date changes, upgrades and extra passengers are available
        // for confirmed bookings until the scheduled departure time.
        // Re-issue Ticket remains available for every confirmed booking.
        const bookingConfirmed =
          String(booking.booking_status).toLowerCase() === 'confirmed';

        const canManage =
          bookingConfirmed && bookingHasNotDeparted();

        $$('.tile', view).forEach(tile => {
          const action = tile.dataset.action;
          const supported = [
            'date',
            'upgrade',
            'passenger',
            'reissue'
          ].includes(action);

          const eligible = action === 'reissue'
            ? bookingConfirmed
            : canManage;

          tile.disabled = !supported || !eligible;

          tile.title = tile.disabled
            ? 'This feature is not available for this booking.'
            : 'Open this management feature';
        });

        let note = $('#manageIntegrationNote', view);

        if (!note) {
          note = document.createElement('p');

          note.id = 'manageIntegrationNote';
          note.className = 'notice notice-info';

          $('.tile-grid', view).before(note);
        }

        note.textContent = bookingConfirmed
          ? canManage
            ? 'Your confirmed booking was retrieved from Supabase. You can manage it until the scheduled train departure. Re-issue Ticket prepares an email draft for review.'
            : 'This confirmed booking can still be re-issued by email. Date changes, class upgrades and additional passengers are unavailable after the scheduled departure.'
          : 'Only confirmed bookings can use these management features. Re-issue Ticket prepares an email draft for review.';

        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });

      } catch (error) {
        console.error('Manage booking error:', error);

        showMessage(
          error.message || 'Unable to retrieve booking.',
          'err'
        );

      } finally {
        button.disabled = false;
        button.textContent = 'Find my booking';
      }
    });


    // TILE EVENTS
    $$('.tile', view).forEach(tile => {
      tile.addEventListener('click', () => {
        if (tile.disabled) return;

        openPanel(
          tile.classList.contains('is-active')
            ? null
            : tile.dataset.action
        );
      });
    });


    // =================================================
    // CHANGE TRAVEL DATE
    // =================================================

    newDate.min = todayISO();

    newDate.addEventListener('input', () => {
      dateBtn.textContent = 'Update travel date';
      dateNotice.textContent = '';
    });

    dateBtn.addEventListener('click', async () => {
      if (!booking) return;

      const requestedDate = newDate.value;

      if (!requestedDate) {
        return notice(
          'dateNotice',
          'Please select a new travel date.',
          'err'
        );
      }

      if (requestedDate < todayISO()) {
        return notice(
          'dateNotice',
          'Travel date cannot be in the past.',
          'err'
        );
      }

      if (requestedDate === booking.travel_date) {
        return notice(
          'dateNotice',
          'This is already your current travel date.',
          'err'
        );
      }

      dateBtn.disabled = true;
      dateBtn.textContent = 'Updating...';

      try {
        const { data, error } =
          await supabaseClient.rpc(
            'change_booking_travel_date',
            {
              p_booking_reference:
                booking.booking_reference,

              p_new_travel_date:
                requestedDate
            }
          );

        if (error) throw error;

        if (!data || !data.new_date) {
          throw new Error(
            'Unable to verify the updated travel date.'
          );
        }

        booking.travel_date = data.new_date;

        paintCard();

        newDate.value = '';

        notice(
          'dateNotice',
          `Travel date successfully changed to ${fmtDate(data.new_date)}. Your assigned seat has been retained.`,
          'ok'
        );

      } catch (error) {
        console.error('Date change error:', error);

        notice(
          'dateNotice',
          error.message || 'Unable to change travel date.',
          'err'
        );

      } finally {
        dateBtn.disabled = false;
        dateBtn.textContent = 'Update travel date';
      }
    });


    // =================================================
    // UPGRADE CLASS
    // =================================================

    const upgradeOptions =
      $$('.opt[data-class]', view);

    upBtn.disabled = true;

    upgradeOptions.forEach(option => {
      option.addEventListener('click', () => {
        if (
          option.disabled ||
          !booking
        ) return;

        chosenClass = option.dataset.class;

        upgradeOptions.forEach(opt => {
          opt.classList.toggle(
            'is-selected',
            opt === option
          );
        });

        const currentClass =
          booking.booking_class || 'Standard';

        if (chosenClass === currentClass) {
          upBtn.disabled = true;

          return notice(
            'upNotice',
            `Your booking is already in ${currentClass}.`,
            'info'
          );
        }

        upBtn.disabled =
          chosenClass !== 'First Class';

        notice(
          'upNotice',
          'First Class demo upgrade fee: ₱61.00. Payment and physical class inventory are not connected.',
          'info'
        );
      });
    });


    // CONFIRM UPGRADE
    upBtn.addEventListener('click', async () => {
      if (!booking || chosenClass !== 'First Class') {
        return;
      }

      if (
        String(booking.booking_status).toLowerCase() !== 'confirmed'
      ) {
        return notice(
          'upNotice',
          'Only confirmed bookings can be upgraded.',
          'err'
        );
      }

      if (!bookingHasNotDeparted()) {
        return notice(
          'upNotice',
          'This booking can only be upgraded before its scheduled departure.',
          'err'
        );
      }

      if (booking.booking_class === 'First Class') {
        return notice(
          'upNotice',
          'This booking is already First Class.',
          'info'
        );
      }

      upBtn.disabled = true;
      upBtn.textContent = 'Processing upgrade...';

      try {
        const { data, error } =
          await supabaseClient.rpc(
            'upgrade_booking_class',
            {
              p_booking_reference:
                booking.booking_reference,

              p_new_class:
                chosenClass
            }
          );

        if (error) throw error;

        if (!data || data.new_class !== 'First Class') {
          throw new Error(
            'Upgrade could not be verified.'
          );
        }

        // Update displayed booking using database result
        booking.booking_class = data.new_class;
        booking.total_fare = Number(data.new_total_fare);

        paintCard();

        chosenClass = null;

        upgradeOptions.forEach(option => {
          option.classList.remove('is-selected');

          if (option.dataset.class === 'First Class') {
            option.disabled = true;
          }
        });

        notice(
          'upNotice',
          `Successfully upgraded to ${data.new_class}. New total fare: ${peso(data.new_total_fare)}. The ₱61 upgrade fee is recorded but not yet paid.`,
          'ok'
        );

      } catch (error) {
        console.error('Upgrade error:', error);

        notice(
          'upNotice',
          error.message || 'Unable to process class upgrade.',
          'err'
        );

      } finally {
        upBtn.textContent = 'Confirm upgrade';

        upBtn.disabled =
          !booking ||
          booking.booking_class === 'First Class' ||
          String(booking.booking_status).toLowerCase() !== 'confirmed' ||
          !bookingHasNotDeparted();
      }
    });


    // =================================================
    // ADD PASSENGER - SUPABASE INTEGRATION
    // =================================================

    const pFirst = $('#pFirst');
    const pLast = $('#pLast');
    const pBtn = $('#pBtn');

    if (pFirst && pLast && pBtn) {
      pBtn.addEventListener('click', async () => {
        if (!booking) {
          return notice('pNotice', 'Find your booking first.', 'err');
        }

        if (String(booking.booking_status).toLowerCase() !== 'confirmed') {
          return notice(
            'pNotice',
            'Only confirmed bookings can add passengers.',
            'err'
          );
        }

        if (!bookingHasNotDeparted()) {
          return notice(
            'pNotice',
            'Passengers can only be added before the scheduled departure.',
            'err'
          );
        }

        const first = pFirst.value.trim();
        const last = pLast.value.trim();

        const validFirst = setError(
          pFirst,
          'pFirstError',
          !first ? 'Enter a first name.' :
          first.length > 75 ? 'First name must be 75 characters or fewer.' : ''
        );

        const validLast = setError(
          pLast,
          'pLastError',
          !last ? 'Enter a last name.' :
          last.length > 75 ? 'Last name must be 75 characters or fewer.' : ''
        );

        if (!validFirst || !validLast) return;

        const fullName = `${first} ${last}`;
        const originalText = pBtn.textContent;

        pBtn.disabled = true;
        pBtn.textContent = 'Adding passenger...';
        notice('pNotice', 'Checking availability and adding passenger...', 'info');

        try {
          // Confirm that the signed-in user still owns this booking.
          const { data: authData, error: authError } =
            await supabaseClient.auth.getUser();

          if (authError) throw authError;
          if (!authData.user) {
            throw new Error('Your session has expired. Please sign in again.');
          }

          const { data, error } = await supabaseClient.rpc(
            'add_passenger_to_booking',
            {
              p_booking_reference: booking.booking_reference,
              p_full_name: fullName,
              p_age: null,
              p_passenger_type: 'adult'
            }
          );

          if (error) throw error;

          // PostgreSQL jsonb RPCs normally return an object. Accept a one-row
          // array as well so the page can handle either response shape.
          const result = Array.isArray(data) ? data[0] : data;

          if (!result || !result.passenger_id || !result.seat_number) {
            throw new Error(
              result?.message ||
              'The database did not return the passenger and seat details. Please refresh and check the booking before trying again.'
            );
          }

          // Update the booking card from the confirmed database response.
          booking.passengers = booking.passengers || [];
          booking.passengers.push({
            passenger_id: result.passenger_id,
            full_name: result.full_name || fullName,
            age: result.age ?? null,
            passenger_type: result.passenger_type || 'adult',
            seat_number: result.seat_number
          });

          booking.total_passengers = Number(
            result.total_passengers ?? (booking.total_passengers + 1)
          );

          if (result.new_total_fare != null) {
            booking.total_fare = Number(result.new_total_fare);
          }

          paintCard();

          pFirst.value = '';
          pLast.value = '';
          setError(pFirst, 'pFirstError', '');
          setError(pLast, 'pLastError', '');

          const extraFare =
            result.added_passenger_fare ?? result.added_fare;
          const fareMessage = extraFare != null
            ? ` Additional fare: ${peso(extraFare)}.`
            : '';
          const totalMessage = result.new_total_fare != null
            ? ` New booking total: ${peso(result.new_total_fare)}.`
            : '';

          notice(
            'pNotice',
            `${result.full_name || fullName} was added successfully. Assigned seat: ${result.seat_number}.${fareMessage}${totalMessage}`,
            'ok'
          );

        } catch (error) {
          console.error('Add passenger error:', error);

          notice(
            'pNotice',
            error.message || 'Unable to add passenger. Please try again.',
            'err'
          );

        } finally {
          pBtn.disabled = false;
          pBtn.textContent = 'Add passenger';
        }
      });
    } else {
      console.warn(
        'Add Passenger form was not found. Check the pFirst, pLast and pBtn IDs in manage.html.'
      );
    }


    // =================================================
    // RE-ISSUE TICKET - PREPARE EMAIL DRAFT
    // =================================================
    // This uses the user's default email application. It does not send
    // mail automatically or claim that delivery has been completed.

    const reEmail = $('#reEmail');
    const reBtn = $('#reBtn');

    if (reEmail && reBtn) {
      reBtn.addEventListener('click', () => {
        if (!booking) {
          return notice(
            'reNotice',
            'Find your booking first.',
            'err'
          );
        }

        if (!bookingConfirmedForReissue()) {
          return notice(
            'reNotice',
            'Only confirmed bookings can be re-issued.',
            'err'
          );
        }

        const recipient = reEmail.value.trim();
        const validEmail = EMAIL_RE.test(recipient);

        if (!setError(
          reEmail,
          'reEmailError',
          !recipient
            ? 'Enter the recipient email address.'
            : !validEmail
              ? 'Enter a valid email address.'
              : ''
        )) {
          return;
        }

        const passengerDetails = (booking.passengers || []).map(
          (person, index) => {
            const name = person.full_name || 'Passenger';
            const type = person.passenger_type || 'Passenger';
            const seat = person.seat_number || 'Not assigned';
            return `${index + 1}. ${name} (${type}) - Seat ${seat}`;
          }
        );

        const ticketBody = [
          'JJCC RAILWAYS - E-TICKET',
          '========================================',
          `Booking reference: ${booking.booking_reference}`,
          `Booking status: ${String(booking.booking_status).toUpperCase()}`,
          `Route: ${booking.departureName} to ${booking.arrivalName}`,
          `Travel date: ${fmtDate(booking.travel_date)}`,
          `Train: ${booking.train_code} - ${booking.train_name}`,
          `Departure: ${booking.departure_time}`,
          `Arrival: ${booking.arrival_time}`,
          `Class: ${booking.booking_class || booking.train_type || 'Standard'}`,
          `Passengers: ${booking.total_passengers ?? passengerDetails.length}`,
          '',
          'PASSENGER DETAILS',
          ...(passengerDetails.length
            ? passengerDetails
            : ['Passenger details are not available.']),
          '',
          `Total fare: ${peso(booking.total_fare)}`,
          '========================================',
          'Please keep this booking reference for your journey.',
          'This message was prepared by JJCC Railways.'
        ].join('\n');

        const subject =
          `JJCC Railways E-ticket - ${booking.booking_reference}`;

        const mailtoUrl =
          `mailto:${recipient}` +
          `?subject=${encodeURIComponent(subject)}` +
          `&body=${encodeURIComponent(ticketBody)}`;

        notice(
          'reNotice',
          'Your email application is opening with the ticket details. Review the recipient and message, then press Send. This page cannot confirm email delivery.',
          'info'
        );

        window.location.href = mailtoUrl;
      });
    } else {
      console.warn(
        'Re-issue Ticket form was not found. Check reEmail and reBtn IDs in manage.html.'
      );
    }

    function bookingConfirmedForReissue() {
      return String(booking?.booking_status || '').toLowerCase() === 'confirmed';
    }


    // SEARCH ANOTHER BOOKING
    $('#searchAnother').addEventListener('click', (e) => {
      e.preventDefault();

      view.hidden = true;
      find.hidden = false;

      booking = null;
      chosenClass = null;

      refIn.value = '';
      emailIn.value = '';

      message.textContent = '';

      dateNotice.textContent = '';
      upNotice.textContent = '';

      upgradeOptions.forEach(option => {
        option.classList.remove('is-selected');
      });

      openPanel(null);

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });

    clearOnInput(form);
    clearOnInput(view);
  }


  /* =========================================================
     LIVE STATUS  (live-status.html)
     ========================================================= */
  const BOARD = {
    TUT: [
      {
        dest: 'Legazpi, Albay',
        op: 'JJCC Railways · Direct',
        sched: '07:00',
        exp: '',
        plat: 5,
        svc: 'JRC-7423',
        status: 'On time',
        dur: 258,
        stops: ['Tutuban', 'Malolos', 'Clark', 'Tarlac City', 'Naga', 'Legazpi']
      },
      {
        dest: 'Legazpi, Albay',
        op: 'JJCC Railways · Direct',
        sched: '09:30',
        exp: '',
        plat: 3,
        svc: 'JRC-7851',
        status: 'On time',
        dur: 265,
        stops: ['Tutuban', 'Malolos', 'Clark', 'Tarlac City', 'Naga', 'Legazpi']
      },
      {
        dest: 'Legazpi',
        op: 'JJCC North Line · via Tarlac City, Tarlac',
        sched: '08:15',
        exp: '08:27',
        plat: 6,
        svc: 'TPE-9204',
        status: 'Delayed 12 min',
        dur: 280,
        stops: ['Tutuban', 'Malolos', 'Clark', 'Tarlac City', 'Legazpi']
      },
      {
        dest: 'Legazpi',
        op: 'JJCC South Line · Direct',
        sched: '06:45',
        exp: '',
        plat: 8,
        svc: 'CPX-4102',
        status: 'Arrived',
        dur: 290,
        stops: ['Tutuban', 'Alabang', 'Calamba', 'Naga', 'Legazpi']
      },
      {
        dest: 'Vigan, Ilocos Sur',
        op: 'JJCC Bicol Sleeper · Direct',
        sched: '23:45',
        exp: '',
        plat: 1,
        svc: 'CAL-9811',
        status: 'On time',
        dur: 527,
        stops: ['Tutuban', 'Malolos', 'Clark', 'Tarlac City', 'Vigan']
      },
    ],

    LGP: [
      {
        dest: 'Tutuban, Manila',
        op: 'JJCC Railways · Direct',
        sched: '06:10',
        exp: '',
        plat: 2,
        svc: 'JRC-7422',
        status: 'On time',
        dur: 258,
        stops: ['Legazpi', 'Naga', 'Clark', 'Malolos', 'Tutuban']
      },
      {
        dest: 'Naga, Camarines Sur',
        op: 'JJCC Bicol Local · Direct',
        sched: '08:40',
        exp: '08:52',
        plat: 4,
        svc: 'BCL-3310',
        status: 'Delayed 12 min',
        dur: 95,
        stops: ['Legazpi', 'Naga']
      },
      {
        dest: 'Tutuban, Manila',
        op: 'JJCC Bicol Sleeper · Direct',
        sched: '19:30',
        exp: '',
        plat: 1,
        svc: 'CAL-9812',
        status: 'On time',
        dur: 527,
        stops: ['Legazpi', 'Naga', 'Tarlac City', 'Tutuban']
      },
    ],

    MLO: [
      {
        dest: 'Tutuban, Manila',
        op: 'JJCC Commuter · Direct',
        sched: '06:20',
        exp: '',
        plat: 1,
        svc: 'COM-1204',
        status: 'On time',
        dur: 70,
        stops: ['Malolos', 'Tutuban']
      },
      {
        dest: 'Clark, Pampanga',
        op: 'JJCC North Line · Direct',
        sched: '07:05',
        exp: '',
        plat: 3,
        svc: 'TPE-9100',
        status: 'On time',
        dur: 55,
        stops: ['Malolos', 'Clark']
      },
      {
        dest: 'Legazpi, Albay',
        op: 'JJCC Railways · Direct',
        sched: '07:50',
        exp: '',
        plat: 2,
        svc: 'JRC-7423',
        status: 'Arrived',
        dur: 190,
        stops: ['Malolos', 'Clark', 'Naga', 'Legazpi']
      },
    ],

    NGA: [
      {
        dest: 'Legazpi, Albay',
        op: 'JJCC Bicol Local · Direct',
        sched: '09:15',
        exp: '',
        plat: 2,
        svc: 'BCL-3311',
        status: 'On time',
        dur: 95,
        stops: ['Naga', 'Legazpi']
      },
      {
        dest: 'Tutuban, Manila',
        op: 'JJCC Railways · Direct',
        sched: '10:05',
        exp: '10:20',
        plat: 1,
        svc: 'JRC-7424',
        status: 'Delayed 15 min',
        dur: 190,
        stops: ['Naga', 'Clark', 'Malolos', 'Tutuban']
      },
    ],

    CRK: [
      {
        dest: 'Tarlac City, Tarlac',
        op: 'JJCC North Line · Direct',
        sched: '08:30',
        exp: '08:42',
        plat: 4,
        svc: 'TPE-9204',
        status: 'Delayed 12 min',
        dur: 55,
        stops: ['Clark', 'Tarlac City']
      },
      {
        dest: 'Tutuban, Manila',
        op: 'JJCC Commuter · Direct',
        sched: '09:00',
        exp: '',
        plat: 2,
        svc: 'COM-1210',
        status: 'On time',
        dur: 85,
        stops: ['Clark', 'Malolos', 'Tutuban']
      },
      {
        dest: 'Legazpi, Albay',
        op: 'JJCC Railways · Direct',
        sched: '09:45',
        exp: '',
        plat: 5,
        svc: 'JRC-7852',
        status: 'On time',
        dur: 210,
        stops: ['Clark', 'Naga', 'Legazpi']
      },
    ],
  };


  const NETWORK = [
    ['East Coast Main Line', 'Good service'],
    ['West Coast Main Line', 'Good service'],
    ['North Main Line', 'Minor delays'],
    ['JJCC South Line', 'Good service'],
    ['JJCC Bicol Sleeper', 'Good service'],
  ];


  /* ---------- LIVE STATUS PAGE ---------- */
  function initStatus() {
    const clock = $('#clock');

    const tick = () => {
      const d = new Date();
      clock.textContent =
        `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    tick();
    setInterval(tick, 1000);

    $('#networkList').innerHTML = NETWORK.map(([n, s]) =>
      `<li>${n}<span class="${s.startsWith('Minor') ? 'minor' : ''}">${s}</span></li>`
    ).join('');


    let current = 'TUT';
    let selected = null;

    const chips = $('#stationChips');
    const body = $('#boardBody');
    const search = $('#boardSearch');
    const card = $('#serviceCard');

    chips.innerHTML = Object.keys(BOARD).map((c) =>
      `<button class="chip" data-code="${c}">${esc(byCode(c).name)}</button>`
    ).join('');

    chips.addEventListener('click', (e) => {
      const b = e.target.closest('.chip');
      if (!b) return;

      current = b.dataset.code;
      selected = null;
      search.value = '';

      paintChips();
      paintBoard();
      paintCard();
    });

    const paintChips = () => {
      $$('.chip', chips).forEach((c) => {
        c.classList.toggle('is-active', c.dataset.code === current);
      });
    };


    function paintBoard() {
      const st = byCode(current);

      $('#boardTitle').textContent =
        `${label(st)} · DEPARTURES`.toUpperCase();

      const q = norm(search.value);

      const rows = BOARD[current].filter((r) =>
        !q || norm(r.svc).includes(q) || norm(r.dest).includes(q)
      );

      body.innerHTML = rows.length
        ? rows.map((r) => {
            const cls = r.status === 'Arrived'
              ? 's-arr'
              : r.status.startsWith('Delayed')
                ? 's-late'
                : 's-on';

            return `
              <tr tabindex="0" data-svc="${r.svc}"
                  class="${selected === r.svc ? 'is-selected' : ''}">
                <td class="dest">
                  <b>${esc(r.dest)}</b>
                  <small>${esc(r.op)}</small>
                </td>
                <td class="time">${r.sched}</td>
                <td>
                  ${r.exp ? `<span class="exp-late">${r.exp}</span>` : '—'}
                </td>
                <td><span class="pbadge">${r.plat}</span></td>
                <td>${r.svc}</td>
                <td class="${cls}">${r.status}</td>
              </tr>`;
          }).join('')
        : '<tr><td colspan="6" style="text-align:center;color:#7f8cab">No services match your search.</td></tr>';
    }


    const select = (tr) => {
      selected = tr.dataset.svc;
      paintBoard();
      paintCard();
    };

    body.addEventListener('click', (e) => {
      const tr = e.target.closest('tr[data-svc]');
      if (tr) select(tr);
    });

    body.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const tr = e.target.closest('tr[data-svc]');
        if (tr) select(tr);
      }
    });

    search.addEventListener('input', paintBoard);


    function paintCard() {
      const r = BOARD[current].find((x) => x.svc === selected);

      if (!r) {
        card.innerHTML = `
          <div class="big">🚂</div>
          <h3>Select a service</h3>
          <p>Click any train to see live route progress and calling points</p>
        `;
        card.className = 'card select-card';
        return;
      }

      const [h, m] = r.sched.split(':').map(Number);

      const start = h * 60 + m + (
        r.exp
          ? Number(r.exp.slice(0, 2)) * 60 +
            Number(r.exp.slice(3)) - (h * 60 + m)
          : 0
      );

      const n = r.stops.length;
      const passedCount = r.status === 'Arrived' ? n : 0;

      card.className = 'card route-prog';

      card.innerHTML = `
        <h3>${r.svc} · ${esc(r.dest)}</h3>
        <p class="sub">${esc(r.op)} · Platform ${r.plat} · ${r.status}</p>
        <ul class="stops">
          ${r.stops.map((s, i) => {
            const t = start + Math.round((r.dur * i) / (n - 1));
            const time = `${pad(Math.floor(t / 60) % 24)}:${pad(t % 60)}`;
            const cls = i < passedCount
              ? 'passed'
              : i === passedCount
                ? 'next'
                : '';

            return `
              <li class="${cls}">
                <span>${esc(s)}</span>
                <span class="t">${time}</span>
              </li>`;
          }).join('')}
        </ul>
      `;
    }

    paintChips();
    paintBoard();
    paintCard();
  }


  /* =========================================================
     REFUND & DELAY  (refund.html)
     ========================================================= */
  async function initRefund() {
    const stages = {
      find: $('#refundFind'),
      choose: $('#refundChoose'),
      done: $('#refundDone')
    };

    const show = (name) => {
      Object.entries(stages).forEach(([key, el]) => {
        el.hidden = key !== name;
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const refIn = $('#rfRef');
    const emailIn = $('#rfEmail');
    const submit = $('#submitBtn');

    let booking = null;
    let mode = 'delay';

    // Status message
    const status = document.createElement('p');
    status.id = 'refundStatus';
    status.className = 'notice';

    const actionRow = $('.action-row', stages.choose);
    stages.choose.insertBefore(status, actionRow);


    // Display messages
    function showStatus(text, type = 'info') {
      status.className = `notice notice-${type}`;
      status.textContent = text;
    }


    // Find booking
    $('#rfForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      showStatus('');

      const reference = refIn.value.trim().toUpperCase();
      const email = emailIn.value.trim().toLowerCase();

      const okR = setError(
        refIn,
        'rfRefError',
        reference ? '' : 'Enter your booking reference.'
      );

      const okE = setError(
        emailIn,
        'rfEmailError',
        !email
          ? 'Enter your booking email.'
          : !EMAIL_RE.test(email)
            ? 'Enter a valid email address.'
            : ''
      );

      if (!okR || !okE) return;

      const findButton = $('#rfForm').querySelector('[type="submit"]');

      findButton.disabled = true;
      findButton.textContent = 'Searching...';

      try {
        // Verify Supabase user
        const { data: authData, error: authError } =
          await supabaseClient.auth.getUser();

        if (authError) throw authError;

        const user = authData.user;

        if (!user) {
          throw new Error('Please sign in before accessing your booking.');
        }

        if (user.email.toLowerCase() !== email) {
          throw new Error(
            'Email does not match your signed-in account.'
          );
        }

        // Retrieve actual booking
        const { data: bookingData, error: bookingError } =
          await supabaseClient
            .from('bookings')
            .select('*')
            .eq('booking_reference', reference)
            .eq('user_id', user.id)
            .maybeSingle();

        if (bookingError) throw bookingError;

        if (!bookingData) {
          throw new Error(
            'No booking found for this reference and account.'
          );
        }

        // Retrieve train and stations
        const [
          trainResult,
          departureResult,
          arrivalResult
        ] = await Promise.all([
          supabaseClient
            .from('trains')
            .select('train_code, train_name, train_type')
            .eq('train_id', bookingData.train_id)
            .maybeSingle(),

          supabaseClient
            .from('stations')
            .select('station_name')
            .eq('station_id', bookingData.departure_station_id)
            .maybeSingle(),

          supabaseClient
            .from('stations')
            .select('station_name')
            .eq('station_id', bookingData.arrival_station_id)
            .maybeSingle()
        ]);

        if (trainResult.error) throw trainResult.error;
        if (departureResult.error) throw departureResult.error;
        if (arrivalResult.error) throw arrivalResult.error;

        if (
          !trainResult.data ||
          !departureResult.data ||
          !arrivalResult.data
        ) {
          throw new Error('Unable to retrieve complete booking details.');
        }

        booking = {
          ...bookingData,
          train_code: trainResult.data.train_code,
          train_name: trainResult.data.train_name,
          train_type: trainResult.data.train_type,
          departureName: departureResult.data.station_name,
          arrivalName: arrivalResult.data.station_name
        };

        // Display actual booking details
        $('#sumRef').textContent = booking.booking_reference;

        $('#sumRoute').textContent =
          `${booking.departureName} → ${booking.arrivalName}`;

        $('#sumMeta').textContent =
          `${booking.train_code} · ${fmtShort(booking.travel_date)} · ${peso(booking.total_fare)}`;

        $('#cxFare').textContent = peso(booking.total_fare);
        $('#cxAdmin').textContent = 'Not calculated';

        const refundRows = $$('.fee-row', $('#cancelPanel'));

        if (refundRows[2]) {
          const estimate = $('b', refundRows[2]);

          if (estimate) {
            estimate.textContent = '₱0.00 — not processed';
          }
        }

        // Explain actual cancellation behavior
        const warning = $('.notice-warn', $('#cancelPanel'));

        if (warning) {
          warning.textContent =
            'Cancellation will update your booking status and release assigned seats. Payment and refund processing are not connected yet.';
        }

        setMode('cancel');
        show('choose');

      } catch (error) {
        console.error('Refund booking lookup error:', error);

        showStatus(
          error.message || 'Unable to retrieve your booking.',
          'err'
        );

      } finally {
        findButton.disabled = false;
        findButton.textContent = 'Find booking';
      }
    });

    clearOnInput($('#rfForm'));


    // Search another booking
    $('#changeBooking').addEventListener('click', () => {
      booking = null;
      refIn.value = '';
      emailIn.value = '';
      showStatus('');
      show('find');
    });

    $('#cancelBtn').addEventListener('click', () => {
      booking = null;
      showStatus('');
      show('find');
    });


    // Choose cancellation or delay mode
    function setMode(selectedMode) {
      mode = selectedMode;

      $$('.choice').forEach((choice) => {
        choice.classList.toggle(
          'is-active',
          choice.dataset.mode === mode
        );
      });

      $('#delayPanel').hidden = mode !== 'delay';
      $('#cancelPanel').hidden = mode !== 'cancel';

      if (mode === 'delay') {
        submit.textContent = 'Delay Repay not connected';
        submit.disabled = true;

        showStatus(
          'Delay Repay submission is not connected to Supabase yet.',
          'warn'
        );

      } else {
        submit.textContent = 'Submit cancellation request';

        submit.disabled =
          !booking ||
          String(booking.booking_status).toLowerCase() !== 'confirmed';

        if (!booking) {
          showStatus('Find your booking first.', 'warn');
        } else if (
          String(booking.booking_status).toLowerCase() !== 'confirmed'
        ) {
          showStatus(
            'Only confirmed bookings can be cancelled.',
            'warn'
          );
        } else {
          showStatus(
            'Review your cancellation reason before submitting.',
            'info'
          );
        }
      }
    }

    $$('.choice').forEach((choice) => {
      choice.addEventListener('click', () => {
        setMode(choice.dataset.mode);
      });
    });


    // Submit cancellation to Supabase
    submit.addEventListener('click', async () => {
      if (mode !== 'cancel' || !booking) return;

      if (
        String(booking.booking_status).toLowerCase() !== 'confirmed'
      ) {
        showStatus(
          'Only confirmed bookings can be cancelled.',
          'err'
        );
        return;
      }

      const reason = $('#cxReason').value;

      if (!reason) {
        showStatus('Please select a cancellation reason.', 'err');
        return;
      }

      submit.disabled = true;
      submit.textContent = 'Submitting cancellation...';

      try {
        const { data, error } = await supabaseClient.rpc(
          'cancel_booking',
          {
            p_booking_reference: booking.booking_reference,
            p_reason: reason
          }
        );

        if (error) throw error;

        if (!data || data.booking_status !== 'cancelled') {
          throw new Error('Cancellation could not be verified.');
        }

        // Update local booking status
        booking.booking_status = 'cancelled';

        // Display cancellation confirmation
        $('#doneTitle').textContent = 'Booking cancelled';

        $('#doneText').textContent =
          'Your booking has been cancelled successfully. Your assigned seats are now available for other bookings.';

        $('.k', $('.claim-ref')).textContent =
          'BOOKING REFERENCE';

        $('#claimRef').textContent =
          data.booking_reference;

        $('#claimPayout').textContent =
          'Refund recorded: ₱0.00 — no refund has been processed.';

        $('#claimMethod').textContent =
          'Payment and refund processing are not connected yet.';

        show('done');

      } catch (error) {
        console.error('Cancellation error:', error);

        showStatus(
          error.message || 'Unable to cancel your booking.',
          'err'
        );

      } finally {
        submit.disabled =
          mode !== 'cancel' ||
          !booking ||
          String(booking.booking_status).toLowerCase() !== 'confirmed';

        submit.textContent = 'Submit cancellation request';
      }
    });
  }


  /* =========================================================
     STATIONS  (stations.html)
     ========================================================= */
  function initStations() {
    let current =
      byCode(new URLSearchParams(location.search).get('code')) ||
      STATIONS[0];

    const listEl = $('#stList');
    const searchEl = $('#stSearch');
    const detail = $('#stDetail');
    const map = $('#stMap');


    // Network map (simple SVG line, north to south)
    const pts = MAP_ORDER.map((code, i) => ({
      code,
      x: 210 + Math.sin(i * 0.9) * 14 + i * 9,
      y: 26 + i * 30
    }));

    map.innerHTML = `
      <svg viewBox="0 0 480 262" role="img" aria-label="Network map">
        <polyline
          points="${pts.map((p) => `${p.x},${p.y}`).join(' ')}"
          fill="none"
          stroke="#14234f"
          stroke-width="2.5"
          stroke-linejoin="round"
        />

        ${pts.map((p) => `
          <g
            class="node"
            data-code="${p.code}"
            tabindex="0"
            role="button"
            aria-label="${esc(byCode(p.code).name)}"
          >
            <circle cx="${p.x}" cy="${p.y}" r="6"/>
            <text x="${p.x - 14}" y="${p.y + 3}" text-anchor="end">
              ${p.code}
            </text>
          </g>
        `).join('')}
      </svg>

      <span class="map-hint">Click a station for details</span>
    `;


    map.addEventListener('click', (e) => {
      const g = e.target.closest('.node');
      if (g) choose(g.dataset.code);
    });

    map.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const g = e.target.closest('.node');
        if (g) choose(g.dataset.code);
      }
    });


    function paintList() {
      const q = norm(searchEl.value);

      const rows = STATIONS.filter((s) =>
        !q ||
        norm(label(s)).includes(q) ||
        norm(s.code).includes(q)
      );

      listEl.innerHTML = rows.length
        ? rows.map((s) => `
          <button
            class="st-item ${s.code === current.code ? 'is-active' : ''}"
            data-code="${s.code}"
          >
            <span class="code">${s.code}</span>

            <span>
              <b>${esc(label(s))}</b>
              <small>
                ${s.platforms
                  ? `${s.platforms} platforms`
                  : 'Platform details unavailable'}
              </small>
            </span>

            <span class="chev">›</span>
          </button>
        `).join('')
        : '<p class="muted">No stations match your search.</p>';
    }


    function paintDetail() {
      const s = current;

      detail.innerHTML = `
        <div class="detail-head">
          <div class="code">${s.code}</div>
          <h2>${esc(label(s))}</h2>
          <p>
            ${s.platforms
              ? `${s.platforms} platforms`
              : 'Platform details unavailable'}
            ${s.zone ? ` · ${s.zone}` : ''}
          </p>
        </div>

        <div class="detail-body">
          <span class="lbl">Station amenities</span>

          <div class="amen-grid">
            ${ALL_AMEN.map((k) => `
              <div class="${s.amen.includes(k) ? '' : 'off'}">
                <span>${AMENITY[k][0]}</span>
                ${AMENITY[k][1]}
              </div>
            `).join('')}
          </div>

          <span class="lbl">Connections</span>
          <ul>
            ${s.conn.map((c) => `<li>${esc(c)}</li>`).join('')}
          </ul>

          <span class="lbl">Accessibility</span>
          <p>${esc(s.access)}</p>
        </div>

        <a class="btn-primary" href="book.html?from=${s.code}">
          Search trains from ${esc(s.name)}
        </a>
      `;

      $$('.node', map).forEach((g) => {
        g.classList.toggle('is-active', g.dataset.code === s.code);
      });
    }


    function choose(code) {
      current = byCode(code);
      if (!current) return;

      paintList();
      paintDetail();
    }

    listEl.addEventListener('click', (e) => {
      const b = e.target.closest('.st-item');
      if (b) choose(b.dataset.code);
    });

    searchEl.addEventListener('input', paintList);

    paintList();
    paintDetail();
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

    items.forEach((acc) => {
      $('.acc-btn', acc).addEventListener('click', () => toggle(acc));
    });

    $$('.pchip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const acc = document.getElementById(chip.dataset.target);
        if (!acc) return;

        toggle(acc, true);
        acc.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }


  /* ---------- START ---------- */
  document.addEventListener('DOMContentLoaded', async () => {
    renderLayout();

    const page = document.body.dataset.page;
    const pagesUsingStations = ['book', 'results', 'stations'];

    if (pagesUsingStations.includes(page)) {
      try {
        await loadStationsFromSupabase();
      } catch (error) {
        // Keep the built-in station list as a fallback if Supabase is unavailable.
        console.error(
          'Could not load stations from Supabase. Using the built-in station list.',
          error
        );
      }
    }

    const pages = {
      login: initLogin,
      book: initBook,
      results: initResults,
      manage: initManage,
      status: initStatus,
      refund: initRefund,
      stations: initStations,
      policy: initPolicy
    };

    const fn = pages[page];
    if (fn) fn();
  });

})();
