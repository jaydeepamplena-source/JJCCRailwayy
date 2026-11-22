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


  // Browser storage for lightweight interface preferences and session display.
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

  // Treat a booking as completed only after its scheduled arrival time.
  // Date/time values are interpreted in the passenger's local browser timezone.
  const isPast = (item) => {
    const travelDate = String(item?.travel_date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(travelDate)) return false;

    const departureTime = String(item?.departure_time || '').slice(0, 8);
    const arrivalTime = String(item?.arrival_time || '23:59:59').slice(0, 8);
    const [year, month, day] = travelDate.split('-').map(Number);
    const [hour = 23, minute = 59, second = 59] = arrivalTime.split(':').map(Number);

    const arrival = new Date(year, month - 1, day, hour, minute, second);
    if (
      Number.isNaN(arrival.getTime()) ||
      arrival.getFullYear() !== year ||
      arrival.getMonth() !== month - 1 ||
      arrival.getDate() !== day
    ) return false;

    // If the train arrives at or after midnight, place its arrival on the next day.
    if (departureTime) {
      const [depHour = 0, depMinute = 0, depSecond = 0] = departureTime.split(':').map(Number);
      const departureMinutes = depHour * 3600 + depMinute * 60 + depSecond;
      const arrivalMinutes = hour * 3600 + minute * 60 + second;
      if (arrivalMinutes <= departureMinutes) arrival.setDate(arrival.getDate() + 1);
    }

    return arrival.getTime() < Date.now();
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
    ['active-bookings', 'Bookings', 'active-bookings.html'],
    ['status', 'Live Status', 'live-status.html'],
    ['stations', 'Stations', 'stations.html'],
    ['policy', 'Travel Info', 'policy.html'],
  ];


  const FOOTER = [
    ['Book', [['Search trains', 'book.html'], ['My bookings', 'active-bookings.html'], ['Group travel', 'book.html']]],
    ['Travel info', [['Live status', 'live-status.html'], ['Station directory', 'stations.html'], ['Travel policy', 'policy.html']]],
    ['Help', [['Frequently asked questions', 'faq.html'], ['Contact us', 'policy.html#help']]],
    ['Company', [['About us', '#'], ['Products & services', '#'], ['Travel journal', '#'], ['Passenger stories', '#']]],
  ];


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

    const pageType = document.body.dataset.page;
    const isMinimalHeader = pageType === 'landing' || pageType === 'login';
    const headerHTML = isMinimalHeader ? `
      <header class="site-header minimal-header ${pageType === 'landing' ? 'landing-header' : 'login-header'}">
        <div class="container header-inner">
          <a class="logo" href="index.html" aria-label="JJCC Railways home">
            <img class="logo-img" src="JCC LOGO.png" alt="" />
            <span class="logo-text">JJCC RAILWAYS</span>
          </a>
          <div class="header-actions">
            <a class="header-signin" id="authBtn" href="signin.html">${userIcon}${session ? 'Sign out' : 'Sign In'}</a>
          </div>
        </div>
      </header>` : `
      <header class="site-header">
        <div class="container header-inner">
          <a class="logo" href="index.html" aria-label="JJCC Railways home">
            <img class="logo-img" src="JCC LOGO.png" alt="" />
            <span class="logo-text">JJCC RAILWAYS</span>
          </a>
          <button class="nav-toggle" id="navToggle" aria-expanded="false" aria-controls="mainNav" aria-label="Toggle menu">
            <span></span><span></span><span></span>
          </button>
          <nav class="main-nav" id="mainNav" aria-label="Main">${nav}</nav>
          <div class="header-actions">
            ${session ? `<div class="notification-wrap" id="notificationWrap">
              <button class="notification-bell" id="notificationBell" type="button" aria-label="Notifications" aria-expanded="false" aria-controls="notificationDropdown">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>
                <span class="notification-count" id="notificationCount" hidden>0</span>
              </button>
              <div class="notification-dropdown" id="notificationDropdown" hidden>
                <div class="notification-dropdown-head"><strong>Notifications</strong><a href="notifications.html">View all</a></div>
                <div id="notificationPreview"><p class="notification-empty">Loading notifications…</p></div>
              </div>
            </div>` : ''}
            <a class="header-signin" id="authBtn" href="signin.html">${userIcon}${session ? 'Sign out' : 'Sign In'}</a>
          </div>
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
            <a class="logo logo-dark" href="index.html" aria-label="JJCC Railways home">
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

    if (session) initNotificationBell();

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


  /* ---------- Notifications ---------- */
  let notificationChannel = null;

  async function getCurrentUser() {
    const { data, error } = await supabaseClient.auth.getUser();
    if (error) throw error;
    return data?.user || null;
  }

  function notificationTarget(item) {
    return item.booking_id ? `active-bookings.html` : 'notifications.html';
  }

  function notificationMarkup(item, compact = false) {
    const date = item.created_at
      ? new Intl.DateTimeFormat('en-PH', {
          dateStyle: 'medium',
          timeStyle: 'short',
          hourCycle: 'h23'
        }).format(new Date(item.created_at))
      : '';
    return `<article class="notification-item${item.is_read ? '' : ' is-unread'}">
      <a class="notification-item-link" href="${notificationTarget(item)}" data-notification-open="${Number(item.notification_id)}">
        <span class="notification-item-title">${esc(item.title || 'Update')}</span>
        <span class="notification-item-message">${esc(item.message || '')}</span>
        <small>${esc(date)}</small>
      </a>
      ${!item.is_read ? `<button class="notification-mark-read" type="button" data-notification-read="${Number(item.notification_id)}">Mark as read</button>` : ''}
    </article>`;
  }

  async function loadUserNotifications(userId, limit = 6) {
    const { data, error } = await supabaseClient
      .from('user_notifications')
      .select('notification_id, booking_id, title, message, notification_type, is_read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  async function markNotificationRead(id, userId) {
    const { error } = await supabaseClient
      .from('user_notifications')
      .update({ is_read: true })
      .eq('notification_id', id)
      .eq('user_id', userId);
    if (error) throw error;
  }

  async function initNotificationBell() {
    const wrap = $('#notificationWrap');
    const bell = $('#notificationBell');
    const dropdown = $('#notificationDropdown');
    const preview = $('#notificationPreview');
    const count = $('#notificationCount');
    if (!wrap || !bell || !dropdown || !preview || !count) return;

    let user;
    try {
      user = await getCurrentUser();
      if (!user) { wrap.hidden = true; return; }
    } catch (error) {
      console.error('Could not verify notification user:', error);
      preview.innerHTML = '<p class="notification-empty">Unable to load notifications.</p>';
      return;
    }

    const refresh = async () => {
      try {
        const items = await loadUserNotifications(user.id, 6);
        const unread = items.filter(item => !item.is_read).length;
        // The badge count is fetched independently so it includes older notifications too.
        const { count: totalUnread, error } = await supabaseClient
          .from('user_notifications').select('notification_id', { count: 'exact', head: true })
          .eq('user_id', user.id).eq('is_read', false);
        if (error) throw error;
        count.textContent = totalUnread > 99 ? '99+' : String(totalUnread || 0);
        count.hidden = !totalUnread;
        preview.innerHTML = items.length
          ? items.map(item => notificationMarkup(item, true)).join('')
          : '<p class="notification-empty">You have no notifications yet.</p>';
      } catch (error) {
        console.error('Notification refresh failed:', error);
        preview.innerHTML = '<p class="notification-empty">Could not load notifications.</p>';
      }
    };

    bell.addEventListener('click', () => {
      const open = dropdown.hidden;
      dropdown.hidden = !open;
      bell.setAttribute('aria-expanded', String(open));
      if (open) refresh();
    });

    wrap.addEventListener('click', async (event) => {
      const readButton = event.target.closest('[data-notification-read]');
      if (readButton) {
        event.preventDefault();
        event.stopPropagation();
        readButton.disabled = true;
        try {
          await markNotificationRead(readButton.dataset.notificationRead, user.id);
          await refresh();
        } catch (error) {
          console.error('Could not mark notification as read:', error);
          readButton.disabled = false;
        }
        return;
      }
      const itemLink = event.target.closest('[data-notification-open]');
      if (itemLink) {
        event.preventDefault();
        try { await markNotificationRead(itemLink.dataset.notificationOpen, user.id); }
        catch (error) { console.error('Could not mark notification as read:', error); }
        location.href = itemLink.href;
      }
    });

    document.addEventListener('click', (event) => {
      if (!wrap.contains(event.target)) {
        dropdown.hidden = true;
        bell.setAttribute('aria-expanded', 'false');
      }
    });

    await refresh();
    if (notificationChannel) supabaseClient.removeChannel(notificationChannel);
    notificationChannel = supabaseClient.channel(`user-notifications-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${user.id}` }, refresh)
      .subscribe();
  }

  async function initNotificationsPage() {
    const message = $('#notificationMessage');
    const list = $('#notificationList');
    try {
      const user = await getCurrentUser();
      if (!user) { location.replace('index.html'); return; }
      const items = await loadUserNotifications(user.id, 100);
      if (!items.length) {
        message.textContent = 'You have no notifications yet.';
        list.innerHTML = '';
        return;
      }
      message.hidden = true;
      list.innerHTML = items.map(item => notificationMarkup(item)).join('');
      list.addEventListener('click', async (event) => {
        const readButton = event.target.closest('[data-notification-read]');
        const itemLink = event.target.closest('[data-notification-open]');
        const target = readButton || itemLink;
        if (!target) return;
        if (itemLink) event.preventDefault();
        const id = target.dataset.notificationRead || target.dataset.notificationOpen;
        try {
          await markNotificationRead(id, user.id);
          if (readButton) {
            const item = items.find(row => String(row.notification_id) === String(id));
            if (item) item.is_read = true;
            list.innerHTML = items.map(item => notificationMarkup(item)).join('');
          } else if (itemLink) {
            location.href = itemLink.href;
          }
        } catch (error) {
          console.error('Could not update notification:', error);
          if (readButton) readButton.disabled = false;
        }
      });
    } catch (error) {
      console.error('Notifications page error:', error);
      message.textContent = error.message || 'Unable to load notifications.';
      message.className = 'notice notice-error';
    }
  }


  /* =========================================================
     LOGIN / CREATE ACCOUNT  (signin.html)
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

      if (profile.role === 'user') {
        let pending = null;
        try {
          pending = JSON.parse(localStorage.getItem('jjcc_pending_journey') || 'null');
        } catch (_) {}
        if (pending && pending.from && pending.to && pending.date) {
          localStorage.removeItem('jjcc_pending_journey');
          const params = new URLSearchParams(pending);
          window.location.replace('results.html?' + params.toString());
          return;
        }
      }

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
            // After the user confirms their email, return to this site's login page.
            // Works on both localhost and the deployed GitHub Pages site.
            emailRedirectTo: new URL('signin.html', window.location.href).toString(),
            data: {
              first_name: first,
              last_name: last,
              full_name: `${first} ${last}`
            }
          }
        });

        if (error) throw error;

        if (data.session) {
          setMessage('signupMessage', 'Account created successfully. Redirecting...', 'ok');
          await startSession(data.user);
        } else {
          setMessage(
            'signupMessage',
            'Account created! Please check your email and confirm your account before signing in.',
            'ok'
          );
        }
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
              redirectTo: new URL('signin.html', window.location.href).toString()
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
    const isLanding = document.body.dataset.page === 'landing';
    const currentSession = store.get('jjcc_session');

    // The account-promotion banner belongs only to signed-out visitors.
    // Keep it on the public landing page, but hide it after sign-in.
    const journeyBanner = $('.journey-banner');
    if (journeyBanner) {
      journeyBanner.hidden = Boolean(currentSession);
    }

    if (!isLanding && !currentSession) {
      window.location.replace('index.html');
      return;
    }

    const fromIn = $('#fromInput');
    const toIn = $('#toInput');
    const dateIn = $('#dateInput');
    const retIn = $('#returnInput');
    const retField = $('#returnField');
    const pax = $('#paxSelect');
    const btn = $('#searchBtn');
    const hint = $('#searchHint');

    let trip = 'oneway';
    const dateRow = document.querySelector('.date-row');
    dateRow?.classList.toggle('is-round-trip', false);

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
      dateRow?.classList.toggle('is-round-trip', trip === 'round');
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

      if (!store.get('jjcc_session')) {
        try {
          localStorage.setItem('jjcc_pending_journey', JSON.stringify(Object.fromEntries(q.entries())));
        } catch (_) {}
        openGuestSignInModal();
        return;
      }

      location.href = 'results.html?' + q.toString();
    });

    // Popular route cards fill the same booking form.
    $$('[data-route-from][data-route-to]').forEach((card) => {
      card.addEventListener('click', (event) => {
        event.preventDefault();
        const from = byCode(card.dataset.routeFrom);
        const to = byCode(card.dataset.routeTo);
        if (from) fromIn.value = label(from);
        if (to) toIn.value = label(to);
        validate();
        document.querySelector('.book-hero').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    // Destination cards set the selected destination and return focus to the search form.
    $$('[data-destination]').forEach((card) => {
      card.addEventListener('click', (event) => {
        event.preventDefault();
        const destination = byCode(card.dataset.destination);
        if (destination) toIn.value = label(destination);
        validate();
        document.querySelector('.book-hero').scrollIntoView({ behavior: 'smooth', block: 'start' });
        toIn.focus({ preventScroll: true });
      });
    });

    validate();
  }

  function openGuestSignInModal() {
    if ($('#guestSignInModal')) return;
    const modal = document.createElement('div');
    modal.className = 'modal guest-auth-modal';
    modal.id = 'guestSignInModal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'guestAuthTitle');
    modal.innerHTML = `
      <div class="modal-box guest-auth-box">
        <button type="button" class="guest-modal-close" aria-label="Close">×</button>
        <div class="guest-auth-icon" aria-hidden="true">⌑</div>
        <h2 id="guestAuthTitle">Sign in to continue</h2>
        <p>Please sign in or create an account to search trains and continue with your booking.</p>
        <a class="btn-primary block" href="signin.html">Sign In</a>
        <a class="btn-outline block" href="signin.html#signup">Create Account</a>
      </div>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelector('.guest-modal-close').addEventListener('click', close);
    modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
    document.addEventListener('keydown', function escModal(event) {
      if (event.key === 'Escape') {
        close();
        document.removeEventListener('keydown', escModal);
      }
    });
    modal.querySelector('.btn-primary').focus();
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

    // Only show departures that are still in the future on the selected
    // travel date. Future travel dates keep all their configured schedules.
    function serviceHasNotDeparted(service) {
      if (date !== todayISO()) return true;

      const match = String(service.dep || '').match(/^(\d{1,2}):(\d{2})$/);
      if (!match) return false;

      const departure = new Date();
      departure.setHours(Number(match[1]), Number(match[2]), 0, 0);
      return departure.getTime() > Date.now();
    }

    function render() {
      const changesInput = $('input[name="changes"]:checked');
      const sortInput = $('input[name="sort"]:checked');

      const changes = changesInput ? changesInput.value : 'all';
      const sort = sortInput ? sortInput.value : 'dep';

      let rows = services.filter((service) =>
        serviceHasNotDeparted(service) &&
        (changes === 'all' ||
          (changes === 'direct'
            ? service.changes === 0
            : service.changes === 1))
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
          : date === todayISO()
            ? '<div class="empty-state">No remaining trains are available for this route today. Please choose another travel date.</div>'
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
        if (selected && serviceHasNotDeparted(selected)) {
          openModal(selected);
        } else {
          render();
          count.textContent = 'That train has already departed. Please choose a later schedule.';
        }
      }
    });


    // Booking creation and seat assignment are handled by the Supabase RPC.
    async function openModal(service) {
      if (!serviceHasNotDeparted(service)) {
        render();
        count.textContent = 'That train has already departed. Please choose a later schedule.';
        return;
      }

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

            <div class="two-col">
              <div class="field">
                <label class="lbl">First name</label>
                <input class="inp" data-passenger-first maxlength="75" value="${esc(person.first_name || '')}" placeholder="First name" required>
              </div>
              <div class="field">
                <label class="lbl">Last name</label>
                <input class="inp" data-passenger-last maxlength="75" value="${esc(person.last_name || '')}" placeholder="Last name" required>
              </div>
            </div>

            <div class="field">
              <label class="lbl">Passenger type</label>
              <select class="inp" data-passenger-type required>
                <option value="adult" ${person.passenger_type === 'adult' ? 'selected' : ''}>Adult</option>
                <option value="child" ${person.passenger_type === 'child' ? 'selected' : ''}>Child</option>
                <option value="senior" ${person.passenger_type === 'senior' ? 'selected' : ''}>Senior Citizen</option>
              </select>
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

          const firstNames = $$('[data-passenger-first]', e.currentTarget);
          const lastNames = $$('[data-passenger-last]', e.currentTarget);
          const types = $$('[data-passenger-type]', e.currentTarget);

          const nextPassengers = [];

          for (let i = 0; i < pax; i++) {
            const firstName = firstNames[i].value.trim();
            const lastName = lastNames[i].value.trim();
            const fullName = `${firstName} ${lastName}`.trim();

            if (!firstName || !lastName || fullName.length > 150) {
              $('#bookingStatus').textContent = `Enter both first and last name for Passenger ${i + 1}.`;
              (!firstName ? firstNames[i] : lastNames[i]).focus();
              return;
            }

            nextPassengers.push({
              first_name: firstName,
              last_name: lastName,
              full_name: fullName,
              age: null,
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

          // The database trigger changes every new booking to pending_payment.
          // Payment must be completed and verified by the Edge Function before
          // the booking becomes confirmed or Manage Booking is enabled.
          const savedPassengers = Array.isArray(data.passengers)
            ? data.passengers
            : assignedPassengers;

          const { data: pendingBooking, error: pendingError } = await supabaseClient
            .from('bookings')
            .select('booking_status, payment_deadline_at, total_fare')
            .eq('booking_reference', data.booking_reference)
            .maybeSingle();
          if (pendingError) throw pendingError;

          const deadlineText = pendingBooking?.payment_deadline_at
            ? new Date(pendingBooking.payment_deadline_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
            : 'within 10 minutes';

          modal.innerHTML = `
            <div class="modal-box" role="dialog" aria-modal="true">
              <h2>Reservation created — payment required</h2>
              <p class="muted">Your seats are temporarily reserved. Upload your payment receipt within 10 minutes. Your booking is confirmed only after administrator approval.</p>
              <div class="ref-big">${esc(data.booking_reference)}</div>
              <div class="modal-rows">
                <div><span>Train</span><b>${esc(data.train_code)}</b></div>
                <div><span>Departure</span><b>${esc(data.departure_time)}</b></div>
                <div><span>Arrival</span><b>${esc(data.arrival_time)}</b></div>
                <div><span>Passengers</span><b>${data.total_passengers}</b></div>
                <div><span>Total fare</span><b>${peso(pendingBooking?.total_fare ?? data.total_fare)}</b></div>
                <div><span>Status</span><b>Pending Payment</b></div>
              </div>
              <p class="notice notice-warn">Receipt upload deadline: ${esc(deadlineText)}. If no receipt is submitted before the deadline, the reservation expires and the seats are released.</p>
              <h3>Passenger seat assignments</h3>
              <div style="margin:12px 0;">
                ${savedPassengers.map((person) => `
                  <div style="display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid #ddd7ca;">
                    <span>${esc(person.full_name)} <small>(${esc(person.passenger_type)})</small></span>
                    <b>${esc(person.seat_number)}</b>
                  </div>`).join('')}
              </div>
              <div class="modal-actions">
                <a href="payment.html?ref=${encodeURIComponent(data.booking_reference)}" class="btn-gold">Proceed to Payment</a>
                <a href="active-bookings.html" class="btn-outline">View my bookings</a>
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
     ACTIVE BOOKINGS (active-bookings.html)
     ========================================================= */
  async function initActiveBookings() {
    const list = $('#activeBookingList');
    const message = $('#activeBookingMessage');
    const count = $('#activeBookingCount');
    const refresh = $('#refreshActiveBookings');
    const search = $('#activeBookingSearch');

    if (!list || !message || !count) return;

    let allActiveBookings = [];
    let bookingView = 'all';
    const tabHost = document.getElementById('bookingViewTabs');

tabHost?.addEventListener('click', (event) => {
  const tab = event.target.closest('[data-booking-view]');
  if (!tab) return;

  event.preventDefault();

  bookingView = tab.dataset.bookingView;

  tabHost.querySelectorAll('[data-booking-view]').forEach(x => {
    x.classList.toggle('is-active', x === tab);
  });

  renderBookings();
});

    const showMessage = (text, type = 'info') => {
      message.textContent = text || '';
      message.className = `notice ${type === 'error' ? 'notice-error' : 'notice-info'}`;
    };

    // Show every booking owned by the signed-in user. Do not hide a booking
    // just because its scheduled departure time has already passed.
    const bookingStatusLabel = (booking) =>
      String(booking.booking_status || 'Unknown').replace(/[_-]/g, ' ').toUpperCase();

    const safeDate = (value) => {
      try {
        return value ? fmtDate(value) : 'Not available';
      } catch {
        return value || 'Not available';
      }
    };

    
function renderBookings() {
  const normalizeSearch = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  const searchTerms = (search?.value || '')
    .trim()
    .split(/\s+/)
    .map(normalizeSearch)
    .filter(Boolean);

  // Determine the booking's primary status.
  const getBookingView = (item) => {
    const status = String(item.booking_status || '')
      .toLowerCase()
      .replace(/[ -]/g, '_');

    const paymentStatus = String(item.latestPayment?.status || '')
      .toLowerCase();

    const refundStatus = String(
      item.refund_status || item.refund_request_status || ''
    ).toLowerCase();

    const refundText = `${status} ${refundStatus}`;

    const hasRefundRequest =
      status.includes('refund') ||
      refundText.includes('refund') ||
      (
        refundStatus &&
        !['none', 'not_requested', 'no_refund'].includes(refundStatus)
      );

    if (hasRefundRequest) return 'refund';

    if (
      status.includes('cancel') ||
      status.includes('expired')
    ) {
      return 'cancelled';
    }

    if (
  ['confirmed', 'completed'].includes(status) ||
  paymentStatus === 'approved'
) {
  return 'confirmed';
}

    if (
      paymentStatus === 'pending_review' ||
      paymentStatus === 'submitted'
    ) {
      return 'to-confirm';
    }

    if (
      status === 'pending_payment' ||
      paymentStatus === 'rejected' ||
      !paymentStatus
    ) {
      return 'to-pay';
    }

    return 'to-pay';
  };

  const descriptions = {
    all: 'All your bookings, regardless of status.',
    'to-pay': 'Bookings waiting for payment and receipt upload.',
    'to-confirm': 'Bookings with an uploaded receipt waiting for admin review.',
    confirmed: 'Bookings approved by the admin with a future departure schedule.',
    cancelled: 'Bookings cancelled by the user or system, including expired and unpaid reservations.',
    refund: 'Bookings with refund requests or refunds currently being processed.',
    'travel-history': 'Your completed journeys, including eligible bookings with refund requests.'
  };

  const description = document.getElementById('bookingViewDescription');

  if (description) {
    description.textContent = descriptions[bookingView] || '';
  }

  // Confirmed shows only journeys whose scheduled departure has not passed.
  // Completed confirmed/refund journeys move to Travel History automatically.
  // Cancelled, expired, To Pay, and To Confirm bookings are not travel history.
  const inView = bookingView === 'all'
    ? allActiveBookings.filter(item =>
        !(getBookingView(item) === 'confirmed' && isPast(item))
      )
    : bookingView === 'confirmed'
      ? allActiveBookings.filter(item =>
          getBookingView(item) === 'confirmed' && !isPast(item)
        )
      : bookingView === 'travel-history'
        ? allActiveBookings.filter(item => {
            const statusView = getBookingView(item);
            return isPast(item) && ['confirmed', 'refund'].includes(statusView);
          })
        : allActiveBookings.filter(
            item => getBookingView(item) === bookingView
          );

  const filtered = inView.filter(item => {
    const searchableValues = [
      item.booking_reference,
      item.train_code,
      item.train_name,
      item.train_type,
      item.departureName,
      item.arrivalName,
      item.travel_date,
      safeDate(item.travel_date),
      item.departure_time,
      item.arrival_time,
      item.booking_class,
      item.booking_status,
      item.total_passengers,
      item.total_fare,
      ...(item.passengers || []).flatMap(person => [
        person.full_name,
        person.passenger_type,
        person.seat_number
      ])
    ];

    const haystack = searchableValues
      .map(normalizeSearch)
      .filter(Boolean)
      .join(' ');

    return searchTerms.every(term => haystack.includes(term));
  });

  count.textContent = String(filtered.length);

  const countLabel = $('#activeBookingCountLabel');

  if (countLabel) {
    const labels = {
      all: 'all booking(s)',
      'to-pay': 'to pay booking(s)',
      'to-confirm': 'to confirm booking(s)',
      confirmed: 'confirmed booking(s)',
      cancelled: 'cancelled & expired booking(s)',
      refund: 'refund booking(s)',
      'travel-history': 'travel history record(s)'
    };

    countLabel.textContent = labels[bookingView] || 'booking(s)';
  }

  // Different empty-state messages for each tab.
  const emptyStates = {
    all: {
      title: 'No Bookings Yet',
      message: "You haven't made any reservations. Start planning your next journey with JJCC Railways."
    },
    'to-pay': {
      title: 'No Payments Due',
      message: "You don't have any bookings awaiting payment."
    },
    'to-confirm': {
      title: 'No Pending Confirmations',
      message: 'Your submitted payments are not awaiting confirmation.'
    },
    confirmed: {
      title: 'No Confirmed Bookings',
      message: 'Your confirmed journeys will appear here.'
    },
    cancelled: {
      title: 'No Cancelled or Expired Bookings',
      message: "You don't have any cancelled or expired reservations."
    },
    refund: {
      title: 'No Refund Requests',
      message: "You don't have any bookings with pending or processed refund requests."
    },
    'travel-history': {
      title: 'No Travel History Yet',
      message: 'Your completed journeys will appear here.'
    }
  };

  if (!filtered.length) {
    const emptyState = emptyStates[bookingView] || emptyStates.all;

    list.innerHTML = `
      <div class="ab-empty">
        <div class="ab-empty-icon">🚆</div>
        <h2>${emptyState.title}</h2>
        <p>${
          inView.length
            ? 'No bookings match your search. Try another booking reference, train, route, or passenger name.'
            : emptyState.message
        }</p>
        ${
          bookingView === 'all'
            ? '<a class="btn-primary ab-book-link" href="book.html">Book a journey</a>'
            : ''
        }
      </div>`;

    return;
  }

  list.innerHTML = filtered.map(item => {
    const passengers = (item.passengers || []).map(person => `
      <div class="ab-passenger">
        <span>${esc(person.full_name || 'Passenger')}</span>
        <span>${esc(String(person.passenger_type || 'Adult'))} · Seat ${esc(person.seat_number || 'Not assigned')}</span>
      </div>
    `).join('');

    const passengerCount = Number(
      item.total_passengers ?? (item.passengers || []).length
    );

    const bookingViewStatus = getBookingView(item);

    const bookingStatusText =
      item.latestPayment?.status === 'pending_review'
        ? 'To Confirm – Awaiting admin review'
        : item.latestPayment?.status === 'rejected'
          ? 'To Pay – Receipt rejected'
          : bookingViewStatus === 'refund'
            ? 'Refund'
            : bookingViewStatus === 'cancelled'
              ? 'Cancelled / Expired'
              : bookingStatusLabel(item);

    const isConfirmed =
  String(item.booking_status || '').toLowerCase() === 'confirmed';

    const paymentButton = String(item.booking_status || '').toLowerCase() === 'pending_payment'
      ? `
        <a
          class="btn-primary ab-action-btn"
          href="payment.html?ref=${encodeURIComponent(item.booking_reference)}">
          ${
            item.latestPayment?.status === 'pending_review'
              ? 'Payment Status'
              : item.latestPayment?.status === 'rejected'
                ? 'Upload New Receipt'
                : 'Proceed to Payment'
          }
        </a>
      `
      : '';

    // Keep booking actions in the correct Bookings view:
    // Confirmed: Manage Booking and Refund.
    // Travel History: Delay Repay for the completed journey.
    const bookingRef = encodeURIComponent(item.booking_reference || '');
    const bookingCreatedAt =
      item.created_at || item.inserted_at || item.booking_created_at || null;
    const bookingCreatedLabel = bookingCreatedAt
      ? new Intl.DateTimeFormat('en-PH', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }).format(new Date(bookingCreatedAt))
      : 'Booking time unavailable';

    const confirmedButtons =
      bookingView === 'confirmed' && isConfirmed && !isPast(item)
        ? `
          <a
            class="btn-outline ab-action-btn"
            href="manage.html?booking=${bookingRef}">
            Manage Booking
          </a>
          <a
            class="btn-outline ab-action-btn"
            href="refund.html?booking=${bookingRef}&amp;mode=cancel">
            Refund
          </a>
        `
        : '';

    const travelHistoryButtons =
      bookingView === 'travel-history' &&
      isPast(item) &&
      ['confirmed', 'refund'].includes(bookingViewStatus)
        ? `
          <a
            class="btn-outline ab-action-btn"
            href="refund.html?booking=${bookingRef}&amp;mode=delay">
            Delay Repay
          </a>
        `
        : '';

    return `
      <article class="active-booking-card">
        <div class="ab-card-top">
          <div>
            <span class="ab-eyebrow">BOOKING REFERENCE</span>
            <h2>${esc(item.booking_reference || '—')}</h2>
            <span class="ab-booked-at">Booked on ${esc(bookingCreatedLabel)}</span>
          </div>

          <span class="ab-status">
            ${esc(bookingStatusLabel(item))}
          </span>
        </div>

        <div class="ab-route">
          <div>
            <span class="ab-eyebrow">FROM</span>
            <strong>${esc(item.departureName || 'Departure station')}</strong>
            <small>${esc(String(item.departure_time || '—').slice(0, 5))}</small>
          </div>

          <div class="ab-route-arrow" aria-hidden="true">→</div>

          <div>
            <span class="ab-eyebrow">TO</span>
            <strong>${esc(item.arrivalName || 'Arrival station')}</strong>
            <small>${esc(String(item.arrival_time || '—').slice(0, 5))}</small>
          </div>
        </div>

        <div class="ab-details">
          <div>
            <span>Travel date</span>
            <strong>${esc(safeDate(item.travel_date))}</strong>
          </div>

          <div>
            <span>Train</span>
            <strong>${esc([item.train_code, item.train_name].filter(Boolean).join(' · ') || 'Not assigned')}</strong>
          </div>

          <div>
            <span>Class</span>
            <strong>${esc(item.booking_class || item.train_type || 'Standard')}</strong>
          </div>

          <div>
            <span>Passenger(s)</span>
            <strong>${esc(String(passengerCount))} </strong>
          </div>

          <div>
            <span>Total fare</span>
            <strong>${peso(item.total_fare || 0)}</strong>
          </div>

          <div>
            <span>Booking status</span>
            <strong>${esc(bookingStatusText)}</strong>
          </div>
        </div>

        <div class="ab-passenger-section">
          <h3>Passenger and seat information</h3>
          ${passengers || '<p class="muted">Passenger details are not available.</p>'}
        </div>

        <div class="ab-actions">
          ${paymentButton}
          ${confirmedButtons}
          ${travelHistoryButtons}

          <a
            class="btn-outline ab-action-btn"
            href="live-status.html">
            Live Train Status
          </a>
        </div>
      </article>
    `;
  }).join('');
}

    async function loadBookings() {
      list.innerHTML = '<div class="ab-loading">Loading your bookings from Supabase...</div>';
      showMessage('');
      if (refresh) {
        refresh.disabled = true;
        refresh.textContent = 'Loading...';
      }

      try {
        const { data: authData, error: authError } =
          await supabaseClient.auth.getUser();

        if (authError) throw authError;
        const user = authData?.user;

        if (!user) {
          window.location.replace('index.html');
          return;
        }

        const { data: bookings, error: bookingError } = await supabaseClient
          .from('bookings')
          .select('*')
          .eq('user_id', user.id)
          .order('travel_date', { ascending: true });

        if (bookingError) throw bookingError;

        const rows = bookings || [];
        const userBookings = rows;

        if (!userBookings.length) {
          allActiveBookings = [];
          renderBookings();
          showMessage('No bookings were found for this account.', 'info');
          return;
        }

        const trainIds = [...new Set(userBookings.map(x => x.train_id).filter(Boolean))];
        const stationIds = [...new Set(userBookings.flatMap(x => [
          x.departure_station_id, x.arrival_station_id
        ]).filter(Boolean))];
        const bookingIds = userBookings.map(x => x.booking_id).filter(Boolean);

        const [trainsResult, stationsResult, linksResult, paymentsResult] = await Promise.all([
          trainIds.length
            ? supabaseClient.from('trains').select('train_id, train_code, train_name, train_type').in('train_id', trainIds)
            : Promise.resolve({ data: [], error: null }),
          stationIds.length
            ? supabaseClient.from('stations').select('station_id, station_name').in('station_id', stationIds)
            : Promise.resolve({ data: [], error: null }),
          bookingIds.length
            ? supabaseClient.from('booking_passengers').select('booking_id, passenger_id, seat_number').in('booking_id', bookingIds)
            : Promise.resolve({ data: [], error: null }),
          bookingIds.length
            ? supabaseClient.from('payment_submissions').select('booking_id,status,submitted_at,admin_note').in('booking_id', bookingIds).order('submitted_at', { ascending: false })
            : Promise.resolve({ data: [], error: null })
        ]);

        if (trainsResult.error) throw trainsResult.error;
        if (stationsResult.error) throw stationsResult.error;
        if (linksResult.error) throw linksResult.error;
        if (paymentsResult.error) throw paymentsResult.error;

        const links = linksResult.data || [];
        const passengerIds = [...new Set(links.map(x => x.passenger_id).filter(Boolean))];

        const peopleResult = passengerIds.length
          ? await supabaseClient
              .from('passengers')
              .select('passenger_id, full_name, age, passenger_type')
              .in('passenger_id', passengerIds)
              .eq('user_id', user.id)
          : { data: [], error: null };

        if (peopleResult.error) throw peopleResult.error;

        const trainMap = new Map((trainsResult.data || []).map(x => [x.train_id, x]));
        const stationMap = new Map((stationsResult.data || []).map(x => [x.station_id, x.station_name]));
        const peopleMap = new Map((peopleResult.data || []).map(x => [x.passenger_id, x]));
        const linksByBooking = new Map();

        links.forEach(link => {
          if (!linksByBooking.has(link.booking_id)) linksByBooking.set(link.booking_id, []);
          const person = peopleMap.get(link.passenger_id);
          if (person) {
            linksByBooking.get(link.booking_id).push({
              ...person,
              seat_number: link.seat_number
            });
          }
        });

        const latestPaymentByBooking = new Map();
        (paymentsResult.data || []).forEach(payment => { if (!latestPaymentByBooking.has(payment.booking_id)) latestPaymentByBooking.set(payment.booking_id, payment); });
        allActiveBookings = userBookings.map(booking => {
          const train = trainMap.get(booking.train_id) || {};
          return {
            ...booking,
            train_code: train.train_code,
            train_name: train.train_name,
            train_type: train.train_type,
            departureName: stationMap.get(booking.departure_station_id),
            arrivalName: stationMap.get(booking.arrival_station_id),
            passengers: linksByBooking.get(booking.booking_id) || [],
            latestPayment: latestPaymentByBooking.get(booking.booking_id) || null
          };
        }).sort((a, b) => {
          const dateA = new Date(a.created_at || a.inserted_at || a.booking_created_at || a.travel_date || 0).getTime();
          const dateB = new Date(b.created_at || b.inserted_at || b.booking_created_at || b.travel_date || 0).getTime();
          return dateB - dateA;
        });

        renderBookings();
      } catch (error) {
        console.error('Active bookings error:', error);
        list.innerHTML = '';
        showMessage(error.message || 'Unable to load your active bookings. Please try again.', 'error');
      } finally {
        if (refresh) {
          refresh.disabled = false;
          refresh.textContent = 'Refresh';
        }
      }
    }

    refresh?.addEventListener('click', loadBookings);
    search?.addEventListener('input', renderBookings);
    await loadBookings();
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
    const changeDraft = { travel_date: null, booking_class: null, passengers: [] };
    let changeDecision = null;

    function draftCount() {
      return Number(Boolean(changeDraft.travel_date)) +
        Number(Boolean(changeDraft.booking_class)) +
        Number(changeDraft.passengers.length > 0);
    }

    function draftAmount() {
      const dateFee = changeDraft.travel_date ? 10 : 0;
      const classFee = changeDraft.booking_class ? 61 : 0;
      const passengerCount = Number(booking?.total_passengers || booking?.passengers?.length || 1);
      const passengerEstimate = changeDraft.passengers.length
        ? Number(booking?.total_fare || 0) / Math.max(1, passengerCount) * changeDraft.passengers.length
        : 0;
      return Math.round((dateFee + classFee + passengerEstimate) * 100) / 100;
    }

    function getOrCreateChangeDecision() {
      if (changeDecision) return changeDecision;
      changeDecision = document.createElement('section');
      changeDecision.className = 'card panel-card';
      changeDecision.id = 'changeDecision';
      changeDecision.hidden = true;
      changeDecision.innerHTML = `
        <h2>Review your booking changes</h2>
        <p class="meta" id="changeDraftSummary"></p>
        <div class="notice notice-info">You can combine the travel date, class upgrade, and one additional passenger into one modification request. All selected changes will be reviewed and approved together.</div>
        <p style="margin-top:22px;margin-bottom:14px"><b>Do you want to make any other changes?</b></p>
        <div class="actions" style="display:flex;gap:14px;row-gap:12px;flex-wrap:wrap;margin-bottom:4px">
          <button type="button" class="btn-outline" id="moreChangesBtn">Yes, add another change</button>
          <button type="button" class="btn-primary" id="proceedChangesBtn">No, proceed to payment</button>
          <button type="button" class="btn-outline" id="cancelChangesBtn">Cancel modification</button>
        </div>`;
      $('#manageView').appendChild(changeDecision);
      const decisionLinks = document.createElement('div');
      decisionLinks.className = 'change-decision-links';
      decisionLinks.style.cssText = 'display:flex;flex-wrap:wrap;gap:18px;margin:16px 0 4px;padding:0 2px';
      decisionLinks.hidden = true;
      decisionLinks.innerHTML = `
        <a href="#" class="underline-link" id="searchAnother">Search a different booking</a>
        <a href="booking-changes.html" class="underline-link">View Booking Changes</a>`;
      $('#manageView').appendChild(decisionLinks);
      $('#moreChangesBtn', changeDecision).addEventListener('click', () => {
        changeDecision.hidden = true;
        decisionLinks.hidden = true;
        openPanel(null);
        updateChangeTiles();
      });
      $('#proceedChangesBtn', changeDecision).addEventListener('click', createChangeRequest);
      $('#cancelChangesBtn', changeDecision).addEventListener('click', () => {
        changeDraft.travel_date = null;
        changeDraft.booking_class = null;
        changeDraft.passengers = [];
        chosenClass = null;
        if (typeof upBtn !== 'undefined') upBtn.disabled = true;
        $$('.opt[data-class]', view).forEach(option => option.classList.remove('is-selected'));
        changeDecision.hidden = true;
        decisionLinks.hidden = true;
        updateChangeTiles();
        openPanel(null);
        notice('manageMessage', 'Your unsubmitted modification draft was cancelled. Your original booking is unchanged.', 'info');
      });
      return changeDecision;
    }

    function updateChangeTiles() {
      const selected = {
        date: Boolean(changeDraft.travel_date),
        upgrade: Boolean(changeDraft.booking_class),
        passenger: changeDraft.passengers.length > 0
      };
      $$('.tile', view).forEach(tile => {
        const action = tile.dataset.action;
        const modificationAction = ['date','upgrade','passenger'].includes(action);
        const alreadyUsed = Boolean(booking?.modification_used);
        const isSelected = Boolean(selected[action]);
        const supported = ['date','upgrade','passenger','reissue'].includes(action);
        const confirmed = String(booking?.booking_status || '').toLowerCase() === 'confirmed';
        tile.disabled = !supported || !confirmed || (modificationAction && (alreadyUsed || isSelected));
        tile.classList.toggle('is-active', isSelected);
        tile.title = isSelected
          ? 'Already added to this modification draft'
          : alreadyUsed && modificationAction
            ? 'This booking has already used its one allowed modification.'
            : 'Open this management feature';
      });
    }

    function showChangeDecision() {
      const panel = getOrCreateChangeDecision();
      const summary = [];
      if (changeDraft.travel_date) summary.push(`Travel date: ${fmtDate(changeDraft.travel_date)}`);
      if (changeDraft.booking_class) summary.push(`Class: ${changeDraft.booking_class}`);
      if (changeDraft.passengers.length) summary.push(`Additional passenger: ${changeDraft.passengers.map(p => p.full_name).join(', ')}`);
      const estimated = draftAmount();
      $('#changeDraftSummary', panel).textContent =
        `${summary.join(' · ')}. Estimated additional amount: ${peso(estimated)}. Final amount is subject to fare and seat validation.`;
      panel.hidden = false;
      const links = $('#manageView .change-decision-links');
      if (links) links.hidden = false;
      panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      updateChangeTiles();
      if (draftCount() >= 3) createChangeRequest();
    }

    async function createChangeRequest() {
      if (!booking || draftCount() === 0) return;
      const proceed = $('#proceedChangesBtn', changeDecision || document);
      if (proceed) { proceed.disabled = true; proceed.textContent = 'Preparing checkout…'; }
      try {
        const changes = {
          travel_date: changeDraft.travel_date,
          booking_class: changeDraft.booking_class,
          passengers: changeDraft.passengers
        };
        const { data, error } = await supabaseClient.rpc('create_booking_change_request', {
          p_booking_reference: booking.booking_reference,
          p_changes: changes,
          p_amount_due: draftAmount()
        });
        if (error) throw error;
        const request = Array.isArray(data) ? data[0] : data;
        const requestId = request?.request_id || request?.id;
        if (!requestId) throw new Error('The modification request could not be created.');
        location.href = `booking-change-payment.html?id=${encodeURIComponent(requestId)}`;
      } catch (error) {
        console.error('Create booking change request:', error);
        notice('manageMessage', error.message || 'Unable to prepare modification checkout.', 'err');
        if (proceed) { proceed.disabled = false; proceed.textContent = 'No, proceed to payment'; }
      }
    }

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

        // Manage Booking is available only after payment has been verified.
        if (String(bookingData.booking_status).toLowerCase() !== 'confirmed') {
          if (String(bookingData.booking_status).toLowerCase() === 'pending_payment') {
            throw new Error(`This reservation is awaiting payment. Complete payment first: payment.html?ref=${bookingData.booking_reference}`);
          }
          throw new Error(`This booking is ${String(bookingData.booking_status).replaceAll('_', ' ')} and cannot be managed.`);
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

        // Keep management tiles clickable for confirmed bookings so users
        // can open each panel and see its available actions. The individual
        // operations still enforce the scheduled-departure restriction.
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

          const modificationAction = ['date', 'upgrade', 'passenger'].includes(action);
          const modificationAlreadyUsed = Boolean(bookingData.modification_used);
          tile.disabled = !supported || !bookingConfirmed ||
            (modificationAction && modificationAlreadyUsed);

          tile.title = modificationAlreadyUsed && modificationAction
            ? 'This booking has already used its one allowed modification.'
            : tile.disabled
              ? 'Only confirmed bookings can open this feature.'
              : 'Open this management feature';
        });

        let note = $('#manageIntegrationNote', view);

        if (!note) {
          note = document.createElement('p');

          note.id = 'manageIntegrationNote';
          note.className = 'notice notice-info';

          $('.tile-grid', view).before(note);
        }

        note.textContent = bookingData.modification_used
          ? 'This booking has already used its one allowed modification. Further changes require cancellation of the entire booking under the applicable cancellation policy. Re-issue Ticket remains available.'
          : bookingConfirmed
            ? canManage
              ? 'Your confirmed booking was retrieved from Supabase. You may combine a travel date change, class upgrade, and one additional passenger into one paid modification request. All changes apply only after Admin approval.'
              : 'Your confirmed booking was retrieved from Supabase. Modification requests are available only before the scheduled departure. Re-issue Ticket remains available.'
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
    // COMBINED MODIFICATION DRAFT
    // Changes are staged locally; no booking data is changed
    // until one combined request is paid and approved by Admin.
    // =================================================

    newDate.min = todayISO();

    newDate.addEventListener('input', () => {
      dateBtn.textContent = 'Add date change';
      dateNotice.textContent = '';
    });

    dateBtn.addEventListener('click', () => {
      if (!booking || !bookingHasNotDeparted()) {
        return notice('dateNotice', 'Changes are only available before the scheduled departure.', 'err');
      }
      const requestedDate = newDate.value;
      if (!requestedDate) return notice('dateNotice', 'Please select a new travel date.', 'err');
      if (requestedDate < todayISO()) return notice('dateNotice', 'Travel date cannot be in the past.', 'err');
      if (requestedDate === booking.travel_date) return notice('dateNotice', 'This is already your current travel date.', 'err');
      if (changeDraft.travel_date) return notice('dateNotice', 'A travel date change is already included in this draft.', 'err');
      changeDraft.travel_date = requestedDate;
      newDate.value = '';
      notice('dateNotice', `Date change to ${fmtDate(requestedDate)} added to your draft. Your booking has not been changed yet.`, 'ok');
      showChangeDecision();
    });

    const upgradeOptions = $$('.opt[data-class]', view);
    upBtn.disabled = true;
    upgradeOptions.forEach(option => {
      option.addEventListener('click', () => {
        if (option.disabled || !booking) return;
        chosenClass = option.dataset.class;
        upgradeOptions.forEach(opt => opt.classList.toggle('is-selected', opt === option));
        const currentClass = booking.booking_class || 'Standard';
        if (chosenClass === currentClass) {
          upBtn.disabled = true;
          return notice('upNotice', `Your booking is already in ${currentClass}.`, 'info');
        }
        upBtn.disabled = chosenClass !== 'First Class';
        notice('upNotice', 'First Class upgrade fee: ₱61.00. This will be included in the combined modification payment.', 'info');
      });
    });

    upBtn.addEventListener('click', () => {
      if (!booking || chosenClass !== 'First Class') return;
      if (!bookingHasNotDeparted()) return notice('upNotice', 'This booking can only be changed before its scheduled departure.', 'err');
      if (changeDraft.booking_class) return notice('upNotice', 'A class upgrade is already included in this draft.', 'err');
      if (booking.booking_class === 'First Class') return notice('upNotice', 'This booking is already First Class.', 'info');
      changeDraft.booking_class = chosenClass;
      chosenClass = null;
      upgradeOptions.forEach(option => option.classList.remove('is-selected'));
      upBtn.disabled = true;
      notice('upNotice', 'First Class upgrade added to your draft. Your original booking is unchanged until Admin approval.', 'ok');
      showChangeDecision();
    });

    const pFirst = $('#pFirst');
    const pLast = $('#pLast');
    const pBtn = $('#pBtn');

    if (pFirst && pLast && pBtn) {
      pBtn.addEventListener('click', () => {
        if (!booking || !bookingHasNotDeparted()) return notice('pNotice', 'Passengers can only be added before the scheduled departure.', 'err');
        const first = pFirst.value.trim();
        const last = pLast.value.trim();
        const validFirst = setError(pFirst, 'pFirstError', !first ? 'Enter a first name.' : first.length > 75 ? 'First name must be 75 characters or fewer.' : '');
        const validLast = setError(pLast, 'pLastError', !last ? 'Enter a last name.' : last.length > 75 ? 'Last name must be 75 characters or fewer.' : '');
        if (!validFirst || !validLast) return;
        if (changeDraft.passengers.length >= 1) return notice('pNotice', 'One additional passenger is allowed in this modification draft.', 'err');
        const fullName = `${first} ${last}`;
        changeDraft.passengers.push({ full_name: fullName, age: null, passenger_type: 'adult' });
        pFirst.value = '';
        pLast.value = '';
        setError(pFirst, 'pFirstError', '');
        setError(pLast, 'pLastError', '');
        notice('pNotice', `${fullName} added to your modification draft. Your original booking is unchanged.`, 'ok');
        showChangeDecision();
      });
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


    // SEARCH ANOTHER BOOKING (link is rendered inside the change review card)
    view.addEventListener('click', (e) => {
      const searchAnotherLink = e.target.closest('#searchAnother');
      if (!searchAnotherLink) return;
      e.preventDefault();

      view.hidden = true;
      find.hidden = false;

      booking = null;
      chosenClass = null;
      changeDraft.travel_date = null;
      changeDraft.booking_class = null;
      changeDraft.passengers = [];
      if (changeDecision) changeDecision.hidden = true;
      const decisionLinks = $('#manageView .change-decision-links');
      if (decisionLinks) decisionLinks.hidden = true;

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
    const requestedBooking = new URLSearchParams(location.search).get('booking');
    if (requestedBooking) {
      (async () => { const { data: auth } = await supabaseClient.auth.getUser(); if (!auth?.user) { location.replace('index.html'); return; } refIn.value = requestedBooking; emailIn.value = auth.user.email || ''; form.requestSubmit(); })();
    }
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
      status.className = `notice ${type === 'error' ? 'notice-err' : type === 'success' ? 'notice-ok' : type === 'warn' ? 'notice-warn' : 'notice-info'}`;
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
            'Paid bookings are cancelled immediately when requested within 24 hours after payment approval, measured from paid_at. No admin approval is required. No refund is automatically transferred.';
        }

        const requestedMode = new URLSearchParams(location.search).get('mode');
        setMode(requestedMode === 'delay' ? 'delay' : 'cancel');
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
    const requestedRefundBooking = new URLSearchParams(location.search).get('booking');
    if (requestedRefundBooking) { const { data: auth } = await supabaseClient.auth.getUser(); if (!auth?.user) { location.replace('index.html'); return; } refIn.value = requestedRefundBooking; emailIn.value = auth.user.email || ''; $('#rfForm').requestSubmit(); }

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
        submit.textContent = 'Cancel booking';

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
      submit.textContent = 'Cancelling booking...';

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
          'Your booking was cancelled immediately. No refund was transferred; any refund must be handled separately by the operator.';

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

        submit.textContent = 'Cancel booking';
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
     PAYMENT RECEIPT UPLOAD (payment.html)
     ========================================================= */
async function initPayment() {
  const status = $('#paymentStatus');
  const reference = new URLSearchParams(location.search).get('ref');

  const fileInput = $('#receiptFile');
  const dropArea = $('#receiptDropArea');
  const browseButton = $('#browseReceipt');
  const preview = $('#receiptPreview');
  const previewImage = $('#receiptImagePreview');
  const fileName = $('#receiptFileName');
  const removeButton = $('#removeReceipt');
  const uploadButton = $('#uploadReceipt');

  let selectedFile = null;
  let previewURL = null;

  const setStatus = (text, type = 'info') => {
    status.className =
      `notice ${
        type === 'error' ? 'notice-err' :
        type === 'success' ? 'notice-ok' :
        type === 'warn' ? 'notice-warn' :
        'notice-info'
      }`;

    status.textContent = text;
  };

  // COPY BANK DETAILS
  $$('[data-copy]').forEach(button => {
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy);

        const originalText = button.textContent;
        button.textContent = 'Copied!';

        setTimeout(() => {
          button.textContent = originalText;
        }, 1500);

      } catch (error) {
        console.error('Copy error:', error);
        setStatus('Unable to copy. Please copy the details manually.', 'error');
      }
    });
  });

  if (!reference) {
    return setStatus('Missing booking reference.', 'error');
  }

  // RECEIPT PREVIEW
  function clearReceipt() {
    selectedFile = null;
    fileInput.value = '';

    if (previewURL) {
      URL.revokeObjectURL(previewURL);
      previewURL = null;
    }

    preview.classList.remove('show');
    previewImage.removeAttribute('src');
    fileName.textContent = '';
    dropArea.classList.remove('dragover');
  }

  function selectReceipt(file) {
    if (!file) return;

    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!allowed.includes(file.type)) {
      clearReceipt();
      setStatus('Please select a JPG, PNG, or WEBP image.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      clearReceipt();
      setStatus('The receipt must not exceed 5 MB.', 'error');
      return;
    }

    clearReceipt();

    selectedFile = file;
    previewURL = URL.createObjectURL(file);

    fileName.textContent = file.name;
    previewImage.src = previewURL;

    preview.classList.add('show');

    setStatus('Receipt selected. Review your image before submitting.', 'info');
  }

  // OPEN FILE PICKER
  browseButton.addEventListener('click', () => {
    fileInput.click();
  });

  dropArea.addEventListener('click', (event) => {
    if (
      event.target.closest('#browseReceipt') ||
      event.target.closest('input')
    ) return;

    fileInput.click();
  });

  dropArea.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', () => {
    selectReceipt(fileInput.files[0]);
  });

  // DRAG AND DROP
  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, event => {
      event.preventDefault();
      event.stopPropagation();
      dropArea.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, event => {
      event.preventDefault();
      event.stopPropagation();
      dropArea.classList.remove('dragover');
    });
  });

  dropArea.addEventListener('drop', event => {
    const file = event.dataTransfer.files[0];
    selectReceipt(file);
  });

  // REMOVE SELECTED RECEIPT
  removeButton.addEventListener('click', () => {
    clearReceipt();
    setStatus('Receipt removed. You can select another image.', 'info');
  });

  try {
    // CHECK AUTHENTICATED USER
    const { data: auth, error: authError } =
      await supabaseClient.auth.getUser();

    if (authError) throw authError;

    if (!auth?.user) {
      location.replace(
        `index.html?next=${encodeURIComponent(
          `payment.html?ref=${reference}`
        )}`
      );
      return;
    }

    // LOAD BOOKING DETAILS
    const { data: booking, error } = await supabaseClient
      .from('bookings')
      .select(`
        booking_id,
        booking_reference,
        booking_status,
        total_fare,
        payment_deadline_at
      `)
      .eq('booking_reference', reference.toUpperCase())
      .eq('user_id', auth.user.id)
      .maybeSingle();

    if (error) throw error;

    if (!booking) {
      throw new Error('Booking not found for this account.');
    }

    $('#paymentReference').textContent = booking.booking_reference;
    $('#paymentAmount').textContent = peso(booking.total_fare);
    $('#instructionAmount').textContent = peso(booking.total_fare);

    const deadline = booking.payment_deadline_at
      ? new Date(booking.payment_deadline_at)
      : null;

    $('#paymentDeadline').textContent = deadline
      ? deadline.toLocaleString('en-PH', {
          dateStyle: 'medium',
          timeStyle: 'short'
        })
      : 'Not available';

    // LOAD LATEST PAYMENT SUBMISSION
    const { data: submissions, error: subError } =
      await supabaseClient
        .from('payment_submissions')
        .select('submission_id,status,admin_note,submitted_at')
        .eq('booking_id', booking.booking_id)
        .order('submitted_at', { ascending: false })
        .limit(1);

    if (subError) throw subError;

    const latest = submissions?.[0];

    // ALREADY CONFIRMED
    if (booking.booking_status === 'confirmed') {
      $('#paymentState').textContent = 'Confirmed';

      setStatus(
        'Your payment receipt was approved and the booking is confirmed.',
        'success'
      );

      return;
    }

    if (booking.booking_status !== 'pending_payment') {
      throw new Error(
        `This booking is ${String(booking.booking_status).replaceAll('_', ' ')} and cannot accept a receipt.`
      );
    }

    // CHECK PAYMENT DEADLINE
    if (!deadline || deadline.getTime() <= Date.now()) {
      $('#paymentState').textContent = 'Expired';

      setStatus(
        'The 10-minute reservation hold has expired. The reserved seats are no longer held.',
        'error'
      );

      return;
    }

    // SHOW PAYMENT INSTRUCTIONS
    $('#paymentInstructions').hidden = false;

    // CHECK PAYMENT REVIEW STATUS
    if (latest?.status === 'pending_review') {
      $('#paymentState').textContent = 'Awaiting review';

      setStatus(
        'Your receipt is waiting for administrator review. You will receive an in-app notification after it is reviewed.',
        'warn'
      );

      return;
    }

    if (latest?.status === 'rejected') {
      $('#paymentState').textContent = 'Receipt rejected';

      setStatus(
        `Your previous receipt was not approved. ${
          latest.admin_note ||
          'Please upload a corrected receipt before the deadline.'
        }`,
        'error'
      );
    } else {
      $('#paymentState').textContent = 'Awaiting receipt';
      setStatus('Please complete your payment and upload your receipt.', 'info');
    }

    $('#receiptSection').hidden = false;

    // SUBMIT PAYMENT RECEIPT
    uploadButton.addEventListener('click', async () => {
      if (!selectedFile) {
        setStatus('Please select a payment receipt first.', 'error');
        return;
      }

      const allowed = [
        'image/jpeg',
        'image/png',
        'image/webp'
      ];

      if (
        !allowed.includes(selectedFile.type) ||
        selectedFile.size > 5 * 1024 * 1024
      ) {
        setStatus(
          'Use JPG, PNG, or WEBP images up to 5 MB.',
          'error'
        );
        return;
      }

      if (
        new Date(booking.payment_deadline_at).getTime() <= Date.now()
      ) {
        setStatus(
          'The 10-minute upload period has expired.',
          'error'
        );
        return;
      }

      uploadButton.disabled = true;
      uploadButton.textContent = 'Uploading…';

      try {
        const safeName = selectedFile.name.replace(
          /[^a-zA-Z0-9._-]/g,
          '_'
        );

        const path =
          `${auth.user.id}/${booking.booking_id}/${Date.now()}-${safeName}`;

        // UPLOAD TO SUPABASE STORAGE
        const { error: uploadError } =
          await supabaseClient.storage
            .from('payment-receipts')
            .upload(path, selectedFile, {
              upsert: false,
              contentType: selectedFile.type
            });

        if (uploadError) throw uploadError;

        // SAVE PAYMENT SUBMISSION
        const { error: insertError } =
          await supabaseClient
            .from('payment_submissions')
            .insert({
              booking_id: booking.booking_id,
              user_id: auth.user.id,
              receipt_path: path
            });

        if (insertError) {
          await supabaseClient.storage
            .from('payment-receipts')
            .remove([path]);

          throw insertError;
        }

        // SUCCESS
        clearReceipt();

        $('#receiptSection').hidden = true;
        $('#receiptResult').hidden = false;

        $('#receiptResult').innerHTML = `
          <h2>Receipt Submitted Successfully</h2>

          <p>
            Your payment receipt is now awaiting administrator approval.
            Your booking will be confirmed after approval.
          </p>

          <a class="btn-primary" style="display:inline-flex; align-items:center; justify-content:center; 
          margin-top:12px;" href="active-bookings.html">
            View My Bookings
          </a>
        `;

        $('#paymentState').textContent = 'Awaiting review';

        setStatus(
          'Receipt uploaded successfully.',
          'success'
        );

      } catch (error) {
        console.error('Receipt upload error:', error);

        setStatus(
          error.message || 'Unable to upload receipt.',
          'error'
        );

        uploadButton.disabled = false;
        uploadButton.textContent = 'Submit Receipt';
      }
    });

  } catch (error) {
    console.error('Payment page error:', error);

    setStatus(
      error.message || 'Unable to load payment details.',
      'error'
    );
  }
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
    const pagesUsingStations = ['landing', 'book', 'results', 'stations'];

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
      landing: initBook,
      book: initBook,
      faq: () => {},
      results: initResults,
      manage: initManage,
      'active-bookings': initActiveBookings,
      payment: initPayment,
      notifications: initNotificationsPage,
      status: initStatus,
      refund: initRefund,
      stations: initStations,
      policy: initPolicy
    };

    const fn = pages[page];
    if (fn) fn();
  });

})();
