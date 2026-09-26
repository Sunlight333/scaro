/*
  SACRO · link na bio

  Loads links.json and renders the page, sends click events to Google
  Analytics 4 (with LGPD consent) and plays the background music after the
  visitor's first tap. If links.json is missing or broken, the built-in
  DEFAULTS below are shown instead, so the page never goes blank.

  Open the site with ?verificar at the end of the address to see whether
  links.json is valid. Preview the neon variants with ?neon=estatico or
  ?neon=animado.
*/
(function () {
  'use strict';

  // Keep in sync with links.json at launch; only shown if links.json breaks.
  const DEFAULTS = {
    welcome: 'Seja bem-vindo inspirado(a)',
    social: [
      { name: 'spotify', url: 'https://open.spotify.com/user/31elwa64kndcyqyg2b7wbxo67h3a', show: true },
      { name: 'instagram', url: 'https://www.instagram.com/use.sacro', show: true },
      { name: 'tiktok', url: 'https://www.tiktok.com/@use.sacro', show: true },
    ],
    buttons: [
      { label: 'LOJA ONLINE', url: 'https://usesacro.com.br/produto/' },
      { label: 'GRUPO VIP', url: 'https://chat.whatsapp.com/IR19nRUUWBLHm8HcfKgQv2' },
      { label: 'SUPORTE', url: 'https://wa.me/5531971384704' },
    ],
    novidades: { title: 'NOVIDADES', image: '', url: '' },
    music: {
      enabled: true,
      file: 'assets/trilha.mp3',
      credit: '“Miserere mei, Deus” (Gregorio Allegri) · Ensamble Escénico Vocal, Sistema Nacional de Fomento Musical (México), via Wikimedia Commons · CC BY 3.0 · trecho editado',
      creditUrl: 'https://commons.wikimedia.org/wiki/File:Allegri_-_Miserere_Mei,_Deus_-_Ensamble_Esc%C3%A9nico_Vocal.webm',
    },
    neon: 'estatico',
  };

  const SOCIAL_LABELS = { spotify: 'Spotify', instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', discord: 'Discord' };
  const TRACKING_PARAM = /^(utm_\w+|si|igsh|igshid|stkn|_r|_t|fbclid)$/i;
  const FADE_IN_SECONDS = 2;
  const KEY_MUTED = 'sacro:muted';
  const KEY_CONSENT = 'sacro:consent';
  const KEY_MUSIC_TIME = 'sacro:musicTime';

  const query = new URLSearchParams(location.search);

  // localStorage/sessionStorage can be missing or throw (private mode, blocked site data).
  function safeStore(name) {
    return {
      get(key) {
        try { return window[name].getItem(key); } catch (e) { return null; }
      },
      set(key, value) {
        try { window[name].setItem(key, value); } catch (e) { /* blocked or private mode */ }
      },
    };
  }
  const storage = safeStore('localStorage');
  const session = safeStore('sessionStorage');

  /* ---------- links.json ---------- */

  async function loadConfig() {
    const warnings = [];
    try {
      const res = await fetch('links.json');
      if (!res.ok) throw new Error(`links.json não encontrado (HTTP ${res.status}).`);
      const raw = JSON.parse(await res.text());
      if (!isObject(raw)) throw new Error('O arquivo precisa começar com { e terminar com }.');
      return { config: normalize(raw, warnings), warnings, error: null };
    } catch (err) {
      console.error('[SACRO] Erro no links.json. Mostrando o conteúdo padrão.', err);
      return { config: normalize(DEFAULTS, []), warnings, error: err.message };
    }
  }

  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function text(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function listOr(value, fallback, key, warnings) {
    if (Array.isArray(value)) return value;
    warnings.push(`"${key}" precisa ser uma lista [ ... ]. Usando o padrão.`);
    return fallback;
  }

  // Accepts http(s), mailto and tel links; drops tracking parameters.
  function cleanUrl(value) {
    const raw = text(value);
    if (!raw) return '';
    let url;
    try { url = new URL(raw, location.href); } catch (e) { return ''; }
    if (!/^(https?|mailto|tel):$/.test(url.protocol)) return '';
    const tracking = [...url.searchParams.keys()].filter((key) => TRACKING_PARAM.test(key));
    tracking.forEach((key) => url.searchParams.delete(key));
    return url.href;
  }

  function normalize(raw, warnings) {
    const welcome = typeof raw.welcome === 'string' ? raw.welcome.trim() : DEFAULTS.welcome;

    const social = listOr(raw.social, DEFAULTS.social, 'social', warnings).flatMap((item, i) => {
      if (!isObject(item)) {
        warnings.push(`social, bloco ${i + 1}: formato inválido. Ignorado.`);
        return [];
      }
      const name = text(item.name).toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (item.show !== true) return [];
      const url = cleanUrl(item.url);
      if (!name || !url) {
        warnings.push(`${name || `social, bloco ${i + 1}`}: "show" está true, mas falta ${name ? 'uma url válida' : 'o "name"'}. Ícone escondido.`);
        return [];
      }
      return [{ name, url, label: SOCIAL_LABELS[name] || name }];
    });

    const buttons = listOr(raw.buttons, DEFAULTS.buttons, 'buttons', warnings).flatMap((item, i) => {
      const label = isObject(item) ? text(item.label) : '';
      const url = isObject(item) ? cleanUrl(item.url) : '';
      if (!label || !url) {
        warnings.push(`Botão ${i + 1}${label ? ` (${label})` : ''}: falta ${label ? 'uma url válida' : 'o "label"'}. Ignorado.`);
        return [];
      }
      return [{ label, url }];
    });

    const n = isObject(raw.novidades) ? raw.novidades : DEFAULTS.novidades;
    const novidades = { title: text(n.title) || 'NOVIDADES', image: text(n.image), url: cleanUrl(n.url) };
    if (text(n.url) && !novidades.url) warnings.push('Novidades: a url não é válida. O card ficou sem link.');

    const m = isObject(raw.music) ? raw.music : DEFAULTS.music;
    const music = {
      enabled: m.enabled !== false && m.enabled !== 'false' && Boolean(text(m.file)),
      file: text(m.file),
      credit: text(m.credit),
      creditUrl: cleanUrl(m.creditUrl),
    };

    const neonWanted = (query.get('neon') || text(raw.neon) || 'estatico').toLowerCase();
    let neon = 'estatico';
    if (['animado', 'b'].includes(neonWanted)) neon = 'animado';
    else if (!['estatico', 'estático', 'a'].includes(neonWanted)) warnings.push(`"neon" deve ser "estatico" ou "animado". Usando "estatico".`);

    return { welcome, social, buttons, novidades, music, neon };
  }

  /* ---------- Rendering ---------- */

  function h(tag, className, content) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content) el.textContent = content;
    return el;
  }

  function externalLink(url, type, name, className) {
    const a = h('a', className);
    a.href = url;
    if (/^https?:/.test(url)) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    a.dataset.linkType = type;
    a.dataset.linkName = name;
    return a;
  }

  // Tracks for the circling light of neon variant B (hidden in variant A).
  function addNeonTracks(el, index) {
    el.style.setProperty('--i', String(index));
    for (const kind of ['halo', 'ring']) {
      const track = h('span', `neon__${kind}`);
      track.setAttribute('aria-hidden', 'true');
      track.append(h('span', 'neon__path'));
      el.append(track);
    }
  }

  function placeholder() {
    const box = h('span', 'card__placeholder');
    const logo = new Image(298, 400);
    logo.src = 'assets/logo.png';
    logo.alt = '';
    box.append(logo);
    return box;
  }

  function render(cfg) {
    const welcome = document.getElementById('welcome');
    welcome.textContent = cfg.welcome;
    welcome.hidden = !cfg.welcome;

    document.getElementById('social').replaceChildren(...cfg.social.map((item) => {
      const a = externalLink(item.url, 'social', item.label, 'social__link');
      a.setAttribute('aria-label', item.label);
      const icon = h('span', 'social__icon');
      icon.style.setProperty('--icon', `url("assets/icons/${item.name}.svg")`);
      a.append(icon);
      return a;
    }));

    document.getElementById('links').replaceChildren(...cfg.buttons.map((item, i) => {
      const a = externalLink(item.url, 'button', item.label, 'btn neon');
      addNeonTracks(a, i);
      a.append(h('span', 'btn__label', item.label));
      return a;
    }));

    const n = cfg.novidades;
    const card = n.url
      ? externalLink(n.url, 'novidades', n.title, 'card neon')
      : h('div', 'card card--static neon');
    addNeonTracks(card, cfg.buttons.length);
    const media = h('span', 'card__media');
    if (n.image) {
      const img = new Image(1200, 560);
      img.alt = '';
      img.decoding = 'async';
      img.addEventListener('error', () => img.replaceWith(placeholder()), { once: true });
      img.src = n.image;
      media.append(img);
    } else {
      media.append(placeholder());
    }
    card.append(h('span', 'card__title', n.title), media);
    document.getElementById('novidades').replaceChildren(card);

    const credit = document.getElementById('credit');
    const m = cfg.music;
    if (m.enabled && m.credit) {
      const content = m.creditUrl ? externalLink(m.creditUrl, 'credit', 'credito-musica') : document.createElement('span');
      content.textContent = m.credit;
      credit.replaceChildren('♪ ', content);
      credit.hidden = false;
    }

    document.documentElement.dataset.neon = cfg.neon;
  }

  /* ---------- Analytics (GA4 + consent mode) ---------- */

  function setupAnalytics() {
    const meta = document.querySelector('meta[name="ga4-id"]');
    const id = meta ? meta.content.trim() : '';
    if (!/^G-[A-Z0-9]{4,}$/i.test(id)) return () => {};

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };

    const choice = storage.get(KEY_CONSENT);
    window.gtag('consent', 'default', {
      analytics_storage: choice === 'granted' ? 'granted' : 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    window.gtag('js', new Date());
    window.gtag('config', id);

    // Load gtag.js after the page is ready so it never delays the first paint.
    const load = () => {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      document.head.append(script);
    };
    if (document.readyState === 'complete') setTimeout(load, 0);
    else window.addEventListener('load', () => setTimeout(load, 0), { once: true });

    if (choice !== 'granted' && choice !== 'denied') askConsent();

    return (name, params) => window.gtag('event', name, Object.assign({ transport_type: 'beacon' }, params));
  }

  function askConsent() {
    const box = document.getElementById('consent');
    const root = document.documentElement;
    const syncHeight = () => root.style.setProperty('--consent-h', box.hidden ? '0px' : `${box.offsetHeight + 10}px`);

    box.hidden = false;
    syncHeight();
    window.addEventListener('resize', syncHeight);

    box.addEventListener('click', (e) => {
      const button = e.target.closest('[data-consent]');
      if (!button) return;
      const value = button.dataset.consent;
      storage.set(KEY_CONSENT, value);
      window.gtag('consent', 'update', { analytics_storage: value });
      box.hidden = true;
      window.removeEventListener('resize', syncHeight);
      syncHeight();
    });
  }

  function trackLinks(track) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[data-link-type]');
      if (!a || a.dataset.linkType === 'credit') return;
      track('link_click', { link_name: a.dataset.linkName, link_type: a.dataset.linkType, link_url: a.href });
    });
  }

  /* ---------- Background music ---------- */

  /*
    Plays through a plain <audio> element rather than the Web Audio API:
    iPhones mute Web Audio when the silent switch is on but let media elements
    play. iOS ignores audio.volume, so the track itself is mastered at the quiet
    background level (about -26 LUFS) and the fade-in only happens where volume
    works. Nothing is downloaded before the first interaction.

    Leaving the page, as agreed with the client:
    - Computer: the music keeps playing while the visitor browses other tabs.
    - Phone: it pauses (no choir over WhatsApp) and continues from the same
      point when the visitor comes back. If the page was reloaded meanwhile,
      the position is kept for this visit and the music continues on the next
      tap, since browsers need a new gesture before playing sound.
  */
  function setupMusic(music, track) {
    const button = document.getElementById('mute');
    if (!music.enabled) return;

    const isPhone = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    let muted = storage.get(KEY_MUTED) === '1';
    let failed = false;
    let audio = null;
    let starting = false;
    let fadeTimer = 0;
    let resumeOnReturn = false;
    let hasPlayed = false;

    const syncButton = () => button.setAttribute('aria-pressed', String(muted));
    syncButton();
    button.hidden = false;

    function fail(err) {
      console.warn('[SACRO] Música indisponível:', err);
      failed = true;
      button.hidden = true;
      if (audio) audio.pause();
    }

    // Quadratic curve sounds even; a no-op on iOS, where volume stays at 1.
    function fadeIn() {
      clearInterval(fadeTimer);
      const began = performance.now();
      audio.volume = 0;
      fadeTimer = setInterval(() => {
        const t = Math.min((performance.now() - began) / (FADE_IN_SECONDS * 1000), 1);
        audio.volume = t * t;
        if (t === 1) clearInterval(fadeTimer);
      }, 50);
    }

    // The first call must happen inside a user gesture. Analytics counts the
    // first successful start and unmutes (`counts`), not resumes.
    function play(counts) {
      if (!audio) {
        audio = new Audio();
        audio.loop = true;
        audio.preload = 'auto';
        audio.addEventListener('error', () => fail(audio.error), { once: true });
        const savedTime = parseFloat(session.get(KEY_MUSIC_TIME));
        audio.src = savedTime > 0 ? `${music.file}#t=${savedTime.toFixed(1)}` : music.file;
        describeToSystem();
      }
      if (starting || !audio.paused) return;
      starting = true;
      fadeIn();
      audio.play()
        .then(() => {
          if (counts || !hasPlayed) track('music_play');
          hasPlayed = true;
        })
        .catch(() => clearInterval(fadeTimer))   // not a gesture the browser accepts; the next one retries
        .finally(() => { starting = false; });
    }

    function setMuted(value) {
      muted = value;
      resumeOnReturn = false;
      storage.set(KEY_MUTED, muted ? '1' : '0');
      syncButton();
      if (failed) return;
      if (muted) {
        track('music_mute');
        clearInterval(fadeTimer);
        if (audio) audio.pause();
      } else {
        play(true);
      }
    }

    function rememberPosition() {
      if (audio && audio.currentTime > 0) session.set(KEY_MUSIC_TIME, audio.currentTime.toFixed(1));
    }

    // Phone left for another app, tab or the lock screen: pause, remember the spot.
    function leave() {
      if (!audio || failed) return;
      rememberPosition();
      if (!audio.paused || starting) {
        resumeOnReturn = true;
        clearInterval(fadeTimer);
        audio.pause();
      }
    }

    // Back on the page: continue where it stopped. Browsers allow this without
    // a new tap because this audio element already played after one; if one
    // refuses, the next tap resumes (onGesture).
    function comeBack() {
      if (!resumeOnReturn) return;
      resumeOnReturn = false;
      if (!muted && !failed) play(false);
    }

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) comeBack();
      else if (isPhone) leave();
      else rememberPosition();
    });
    // Leaving the page itself (in-app browsers replace it when a link is tapped).
    window.addEventListener('pagehide', leave);
    window.addEventListener('pageshow', (e) => { if (e.persisted) comeBack(); });

    // Title, artwork and play/pause on the lock screen and notification shade.
    function describeToSystem() {
      if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'Trilha sonora',
          artist: 'SACRO',
          artwork: [
            { src: new URL('assets/apple-touch-icon.png', location.href).href, sizes: '180x180', type: 'image/png' },
            { src: new URL('assets/favicon.png', location.href).href, sizes: '192x192', type: 'image/png' },
          ],
        });
        navigator.mediaSession.setActionHandler('play', () => setMuted(false));
        navigator.mediaSession.setActionHandler('pause', () => setMuted(true));
      } catch (e) { /* older browsers: no system controls */ }
    }

    // Browsers accept different events as the gesture that allows sound
    // (touch: pointerup/touchend), so listen to all of them. The listener
    // stays on so a tap resumes the music if the system paused it (a call,
    // headphones unplugged).
    function onGesture(e) {
      if (failed || muted || button.contains(e.target)) return;
      if (!audio || audio.paused) {
        resumeOnReturn = false;
        play(false);
      }
    }
    for (const type of ['pointerdown', 'touchstart', 'keydown', 'pointerup', 'touchend', 'click']) {
      document.addEventListener(type, onGesture, { capture: true, passive: true });
    }

    button.addEventListener('click', () => setMuted(!muted));
  }

  /* ---------- ?verificar: links.json check for the site owner ---------- */

  function showCheck(result) {
    if (!query.has('verificar')) return;
    const box = document.getElementById('check');
    if (result.error) {
      box.textContent = `✖ O links.json tem um erro. O site está mostrando o conteúdo padrão.\n${result.error}`;
      box.classList.add('check--error');
    } else if (result.warnings.length) {
      box.textContent = `⚠ links.json carregado, mas com avisos:\n• ${result.warnings.join('\n• ')}`;
      box.classList.add('check--warn');
    } else {
      box.textContent = '✔ links.json está correto.';
    }
    box.hidden = false;
  }

  /* ---------- Start ---------- */

  const track = setupAnalytics();
  trackLinks(track);

  loadConfig().then((result) => {
    let config = result.config;
    try {
      render(config);
    } catch (err) {
      console.error('[SACRO] Falha ao montar a página. Mostrando o conteúdo padrão.', err);
      config = normalize(DEFAULTS, []);
      render(config);
    }
    if (result.warnings.length) console.warn(`[SACRO] Avisos do links.json:\n${result.warnings.join('\n')}`);
    showCheck(result);
    setupMusic(config.music, track);
  });
})();
