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
    neon: 'animado',
  };

  const SOCIAL_LABELS = { spotify: 'Spotify', instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', discord: 'Discord' };
  const TRACKING_PARAM = /^(utm_\w+|si|igsh|igshid|stkn|_r|_t|fbclid)$/i;
  const MUSIC_VOLUME = 0.25;
  const FADE_IN_SECONDS = 2;
  const KEY_MUTED = 'sacro:muted';
  const KEY_CONSENT = 'sacro:consent';

  const query = new URLSearchParams(location.search);

  const storage = {
    get(key) {
      try { return localStorage.getItem(key); } catch (e) { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); } catch (e) { /* blocked or private mode */ }
    },
  };

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

    const neonWanted = (query.get('neon') || text(raw.neon) || 'animado').toLowerCase();
    let neon = 'animado';
    if (['estatico', 'estático', 'a'].includes(neonWanted)) neon = 'estatico';
    else if (!['animado', 'b'].includes(neonWanted)) warnings.push(`"neon" deve ser "animado" ou "estatico". Usando "animado".`);

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
    Browsers only allow sound after a user gesture, and iOS ignores
    audio.volume, so the track is decoded into an AudioBuffer (sample-accurate,
    gapless loop) and played through a GainNode for the fade and volume.
    Nothing is downloaded before the first interaction.
  */
  function setupMusic(music, track) {
    const button = document.getElementById('mute');
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!music.enabled || !AudioCtx) return;

    let muted = storage.get(KEY_MUTED) === '1';
    let failed = false;
    let ctx = null;
    let gain = null;
    let buffer = null;
    let source = null;

    const syncButton = () => button.setAttribute('aria-pressed', String(muted));
    syncButton();
    button.hidden = false;

    // Exponential approach from the current level; ~95% after `seconds`.
    function fadeTo(value, seconds) {
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(value, now, seconds / 3);
    }

    function begin() {
      if (source || !buffer || muted || document.hidden || ctx.state !== 'running') return;
      source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gain);
      source.start();
      fadeTo(MUSIC_VOLUME, FADE_IN_SECONDS);
      track('music_play');
    }

    function fail(err) {
      console.warn('[SACRO] Música indisponível:', err);
      failed = true;
      button.hidden = true;
      if (ctx) ctx.close().catch(() => {});
    }

    // Must run inside a user gesture (creates/resumes the AudioContext).
    function start() {
      if (!ctx) {
        try {
          ctx = new AudioCtx();
        } catch (err) {
          fail(err);
          return;
        }
        gain = ctx.createGain();
        gain.gain.value = 0;
        gain.connect(ctx.destination);
        ctx.addEventListener('statechange', begin);
        fetch(music.file)
          .then((res) => {
            if (!res.ok) throw new Error(`${music.file}: HTTP ${res.status}`);
            return res.arrayBuffer();
          })
          .then((data) => new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject)))
          .then((decoded) => {
            buffer = decoded;
            begin();
          })
          .catch(fail);
      }
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      begin();
    }

    // Different browsers unlock audio on different events (touch unlocks on
    // pointerup/touchend), so listen to all of them. The listener stays on to
    // resume after iOS interrupts the audio session.
    function onGesture(e) {
      if (failed || muted || button.contains(e.target)) return;
      if (!source) start();
      else if (ctx.state !== 'running' && !document.hidden) ctx.resume().catch(() => {});
    }
    for (const type of ['pointerdown', 'touchstart', 'keydown', 'pointerup', 'touchend', 'click']) {
      document.addEventListener(type, onGesture, { capture: true, passive: true });
    }

    button.addEventListener('click', () => {
      muted = !muted;
      storage.set(KEY_MUTED, muted ? '1' : '0');
      syncButton();
      if (failed) return;
      if (muted) {
        track('music_mute');
        if (source) {
          fadeTo(0, 0.3);
          setTimeout(() => { if (muted) ctx.suspend().catch(() => {}); }, 350);
        }
      } else if (!source) {
        start();
      } else {
        ctx.resume().catch(() => {});
        fadeTo(MUSIC_VOLUME, 0.6);
        track('music_play');
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (!ctx || failed) return;
      if (document.hidden) {
        ctx.suspend().catch(() => {});
      } else if (!muted) {
        ctx.resume().catch(() => {});
        begin();
      }
    });
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
