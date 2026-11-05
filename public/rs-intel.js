/* eslint-disable */
/*! RaveSoft Intelligence — first-party tracker. ~no dependencies, loaded async (lazyOnload). Documented in docs/intelligence.md.
 *  Collects: page views, engaged/elapsed time, scroll milestones, CTA/contact clicks, form start/field-name interaction (NEVER values),
 *  web vitals, JS errors, failed same-origin API calls. Success of a lead is NEVER declared here — only the server does that. */
(function () {
  'use strict';
  if (window.__rsIntel || typeof document === 'undefined') return;
  window.__rsIntel = true;

  var script = document.currentScript || document.querySelector('script[src*="rs-intel.js"]');
  var MODE = (script && script.getAttribute('data-consent-mode')) === 'opt_in' ? 'opt_in' : 'opt_out';
  var ENDPOINT = '/api/intel/collect';
  var SESSION_MS = 30 * 60 * 1000;
  var IDLE_MS = 15000;          // no interaction for 15s => reader is considered inactive (not "engaged")
  var HEARTBEAT_MS = 15000;
  var FLUSH_MS = 8000;
  var MAX_QUEUE = 100;
  var CAMPAIGN_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid', 'ttclid', 'li_fat_id', 'solution'];

  function ls(k, v) {
    try {
      if (v === undefined) return window.localStorage.getItem(k);
      if (v === null) window.localStorage.removeItem(k); else window.localStorage.setItem(k, v);
    } catch (e) { /* storage blocked */ }
    return null;
  }
  function uid() {
    var a = new Uint8Array(12), s = '';
    (window.crypto || window.msCrypto).getRandomValues(a);
    var c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
    for (var i = 0; i < a.length; i++) s += c[a[i] & 63];
    return s;
  }
  function cookie(name, val, maxAge) {
    try {
      document.cookie = name + '=' + encodeURIComponent(val) + '; Path=/; Max-Age=' + maxAge + '; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
    } catch (e) { /* cookies blocked */ }
  }
  function readCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  // ── opt-outs ──────────────────────────────────────────────────────────────────────────────────
  var q = new URLSearchParams(location.search);
  if (q.get('rs_ignore') === '1') ls('rs_ignore', '1');
  if (q.get('rs_ignore') === '0') ls('rs_ignore', null);
  var consent = ls('rs_consent'); // 'granted' | 'denied' | null
  function blocked() {
    return ls('rs_ignore') === '1' ||
      navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true ||
      navigator.webdriver === true || consent === 'denied' || (MODE === 'opt_in' && consent !== 'granted');
  }

  // ── identity & session ────────────────────────────────────────────────────────────────────────
  var vid = null, sess = null;
  function ensureIds() {
    vid = ls('rs_vid') || readCookie('rs_vid');
    if (!vid || !/^[A-Za-z0-9_-]{8,40}$/.test(vid)) vid = uid();
    ls('rs_vid', vid); cookie('rs_vid', vid, 63072000); // 2 years
    var now = Date.now(), raw = ls('rs_sess'), s = null;
    try { s = raw ? JSON.parse(raw) : null; } catch (e) { s = null; }
    var sig = campaignSig();
    if (!s || !s.id || now - s.last > SESSION_MS || (sig && s.sig !== sig)) s = { id: uid(), last: now, sig: sig || (s && now - s.last <= SESSION_MS ? s.sig : '') };
    s.last = now; sess = s;
    ls('rs_sess', JSON.stringify(s)); cookie('rs_sid', s.id, 1800);
  }
  function touchSession() {
    var now = Date.now();
    if (sess && now - sess.last > 10000) { sess.last = now; ls('rs_sess', JSON.stringify(sess)); cookie('rs_sid', sess.id, 1800); }
  }
  function campaignSig() {
    var p = new URLSearchParams(location.search), out = [];
    ['utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'fbclid', 'ttclid', 'li_fat_id'].forEach(function (k) { if (p.get(k)) out.push(k + '=' + p.get(k).slice(0, 40)); });
    return out.join('&');
  }

  // ── queue / transport ─────────────────────────────────────────────────────────────────────────
  var queue = [], failures = 0, nextTry = 0, lastActivity = Date.now(), flushTimer = 0;
  function ctx() {
    var qs = {}, p = new URLSearchParams(location.search);
    CAMPAIGN_KEYS.forEach(function (k) { var v = p.get(k); if (v) qs[k] = v.slice(0, 300); });
    return {
      path: location.pathname, title: (document.title || '').slice(0, 255), referrer: (document.referrer || '').slice(0, 500), qs: qs,
      screen: screen.width + 'x' + screen.height, viewport: window.innerWidth + 'x' + window.innerHeight,
      lang: (navigator.language || '').slice(0, 20), tz: (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } })()
    };
  }
  function enqueue(type, props, pvId) {
    if (blocked() || !vid) return;
    if (queue.length >= MAX_QUEUE) queue.shift();
    queue.push({ id: uid(), type: type, t: Date.now(), path: location.pathname, pv: pvId || (pv && pv.id) || undefined, props: props });
    if (!flushTimer) flushTimer = setTimeout(function () { flushTimer = 0; flush(false); }, FLUSH_MS); // batch for a few seconds, then send
  }
  function flush(useBeacon) {
    if (!queue.length || blocked() || !vid) return;
    if (!useBeacon && (Date.now() < nextTry || navigator.onLine === false)) return;
    var batch = queue.splice(0, 25);
    var body = JSON.stringify({ v: 1, vid: vid, sid: sess.id, consent: consent === 'granted', ctx: ctx(), events: batch });
    function requeue() { failures++; nextTry = Date.now() + Math.min(60000, 2000 * Math.pow(2, failures)); queue = batch.concat(queue).slice(0, MAX_QUEUE); }
    try {
      if (useBeacon && navigator.sendBeacon) {
        if (!navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain;charset=UTF-8' }))) requeue();
        return;
      }
      fetch(ENDPOINT, { method: 'POST', body: body, keepalive: true, credentials: 'same-origin', headers: { 'Content-Type': 'text/plain;charset=UTF-8' } })
        .then(function (r) {
          if (r.status >= 500 || r.status === 429) { requeue(); return; }
          failures = 0;
          return r.json().then(function (j) { if (j && j.sid && j.sid !== sess.id) { sess.id = j.sid; ls('rs_sess', JSON.stringify(sess)); cookie('rs_sid', j.sid, 1800); } }, function () {});
        }, requeue);
    } catch (e) { requeue(); }
  }

  // ── page view lifecycle ───────────────────────────────────────────────────────────────────────
  var pv = null, ticker = null, lastTick = 0, seenForms = {}, seenFields = {}, counts = { click: 0, err: 0, req: 0 };
  function startPageview(isSoft, from) {
    if (blocked()) return;
    ensureIds();
    var t = performance.now();
    pv = { id: uid(), path: location.pathname + location.search, engaged: 0, elapsed: 0, scroll: 0, milestones: {}, lastSent: '' };
    seenForms = {}; seenFields = {}; counts = { click: 0, err: 0, req: 0 };
    lastTick = t; lastActivity = Date.now();
    var id = pv.id;
    var send = function () {
      if (!pv || pv.id !== id) return;
      enqueue('page_view', { title: (document.title || '').slice(0, 120) }, id);
      if (isSoft) enqueue('internal_navigation', { from: (from || '').slice(0, 120) }, id);
      flush(false);
      scanForms();
    };
    isSoft ? setTimeout(send, 250) : send();
    onScroll();
  }
  function snapshot() { return pv ? { eng: Math.round(pv.engaged / 1000), el: Math.round(pv.elapsed / 1000), scroll: pv.scroll >= 100 ? 100 : pv.scroll >= 90 ? 90 : pv.scroll >= 75 ? 75 : pv.scroll >= 50 ? 50 : pv.scroll >= 25 ? 25 : 0 } : null; }
  function heartbeat(type) {
    var s = snapshot();
    if (!s) return;
    var key = s.eng + ':' + s.el + ':' + s.scroll;
    if (type === 'engagement_heartbeat' && key === pv.lastSent) return;
    pv.lastSent = key;
    enqueue(type, s);
  }
  function tick() {
    if (!pv) return;
    var t = performance.now(), dt = Math.min(2000, t - lastTick); lastTick = t;
    if (document.visibilityState === 'visible') {
      pv.elapsed += dt;                                   // visible time on this page
      if (Date.now() - lastActivity <= IDLE_MS) pv.engaged += dt; // …of which the visitor was actually active
    }
  }
  function endPageview() {
    if (!pv) return;
    tick(); heartbeat('page_exit'); pv = null;
  }
  function startTimers() {
    if (ticker) return;
    ticker = setInterval(tick, 1000);
    setInterval(function () { if (document.visibilityState === 'visible') { heartbeat('engagement_heartbeat'); touchSession(); } flush(false); }, HEARTBEAT_MS);
  }
  function activity() { lastActivity = Date.now(); }
  ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel', 'click'].forEach(function (ev) { window.addEventListener(ev, activity, { passive: true, capture: true }); });

  // ── scroll ────────────────────────────────────────────────────────────────────────────────────
  var raf = 0;
  function onScroll() {
    activity();
    if (raf || !pv) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      if (!pv) return;
      var d = document.documentElement, h = Math.max(d.scrollHeight, document.body ? document.body.scrollHeight : 0) - window.innerHeight;
      var pct = h <= 0 ? 100 : Math.min(100, Math.round(((window.pageYOffset || d.scrollTop) / h) * 100));
      if (pct > pv.scroll) pv.scroll = pct;
      [25, 50, 75, 90, 100].forEach(function (m) {
        if (pv.scroll >= (m === 100 ? 99 : m) && !pv.milestones[m]) { pv.milestones[m] = 1; enqueue('scroll', { depth: m }); }
      });
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // ── clicks / CTAs ─────────────────────────────────────────────────────────────────────────────
  var CTA_PATHS = /^\/(contact|get-started|book-consultation)(\/|$)/;
  var FILES = /\.(pdf|docx?|xlsx?|pptx?|csv|zip|rar|7z|mp3|mp4)(\?|$)/i;
  function label(el) { return (el.getAttribute('data-cta') || el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60); }
  document.addEventListener('click', function (e) {
    if (blocked() || !pv || !e.target || !e.target.closest) return;
    var el = e.target.closest('a[href],button,[data-cta]');
    if (!el) return;
    try {
      var href = el.getAttribute('href'), cta = el.getAttribute('data-cta');
      if (el.tagName === 'A' && href) {
        var u = new URL(href, location.href);
        if (u.protocol === 'tel:') return enqueue('phone_click', { target: 'tel' });
        if (u.protocol === 'mailto:') return enqueue('email_click', { target: 'mailto' });
        if (/(^|\.)(wa\.me|whatsapp\.com)$/.test(u.hostname)) return enqueue('whatsapp_click', { host: u.hostname, label: label(el) });
        if (u.origin !== location.origin) return enqueue('outbound_click', { host: u.hostname, label: label(el) });
        if (el.hasAttribute('download') || FILES.test(u.pathname)) return enqueue('file_download', { file: u.pathname.split('/').pop().slice(0, 80) });
        if (CTA_PATHS.test(u.pathname) || cta) {
          enqueue('cta_click', { target: u.pathname, label: label(el) });
          if (/book-consultation/.test(u.pathname) || cta === 'demo') enqueue('demo_request', { target: u.pathname });
        }
        return;
      }
      if (cta) { enqueue('cta_click', { target: location.pathname, label: label(el) }); if (cta === 'demo') enqueue('demo_request', { target: location.pathname }); return; }
      if (el.tagName === 'BUTTON' && el.type !== 'submit' && counts.click++ < 20) enqueue('click', { label: label(el) });
    } catch (err) { /* never throw into the page */ }
  }, true);

  // ── forms (names only; values are never read) ─────────────────────────────────────────────────
  function formKey(form) {
    var idx = Array.prototype.indexOf.call(document.forms, form);
    return (form.id || form.getAttribute('name') || 'form' + idx).slice(0, 40);
  }
  function sensitive(el) {
    var t = (el.type || '').toLowerCase(), ac = (el.getAttribute('autocomplete') || '').toLowerCase();
    return t === 'password' || t === 'hidden' || t === 'file' || el.hasAttribute('data-rs-mask') || /^cc-|one-time|new-password|current-password/.test(ac);
  }
  document.addEventListener('focusin', function (e) {
    var el = e.target;
    if (blocked() || !pv || !el || !el.form || !/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) || sensitive(el)) return;
    var fk = formKey(el.form), fname = (el.name || el.id || el.type || 'field').slice(0, 40);
    if (!seenForms[fk]) { seenForms[fk] = 1; enqueue('form_start', { form: fk }); }
    var k = fk + ':' + fname;
    if (!seenFields[k] && Object.keys(seenFields).length < 30) { seenFields[k] = 1; enqueue('form_field_interaction', { form: fk, field: fname, ftype: (el.type || el.tagName).toLowerCase().slice(0, 20) }); }
  }, true);
  document.addEventListener('submit', function (e) {
    if (blocked() || !pv || !e.target || !e.target.tagName || e.target.tagName !== 'FORM') return;
    enqueue('form_submit_attempt', { form: formKey(e.target) });
    flush(true);
  }, true);
  function scanForms() {
    if (!('IntersectionObserver' in window)) return;
    setTimeout(function () {
      var forms = document.forms, io = new IntersectionObserver(function (ents, o) {
        ents.forEach(function (en) { if (en.isIntersecting && pv) { enqueue('form_view', { form: formKey(en.target) }); o.unobserve(en.target); } });
      }, { threshold: 0.4 });
      for (var i = 0; i < forms.length; i++) if (forms[i].querySelector('input,textarea,select')) io.observe(forms[i]);
    }, 1200);
  }

  // ── video ─────────────────────────────────────────────────────────────────────────────────────
  document.addEventListener('play', function (e) { if (e.target && e.target.tagName === 'VIDEO') enqueue('video_play', { src: (e.target.currentSrc || '').split('?')[0].split('/').pop().slice(0, 60) }); }, true);
  document.addEventListener('ended', function (e) { if (e.target && e.target.tagName === 'VIDEO') enqueue('video_complete', { src: (e.target.currentSrc || '').split('?')[0].split('/').pop().slice(0, 60) }); }, true);

  // ── errors, failed requests ───────────────────────────────────────────────────────────────────
  window.addEventListener('error', function (e) {
    if (!pv || counts.err++ >= 5) return;
    var src = ''; try { src = new URL(e.filename || '', location.href).pathname.slice(-80); } catch (x) {}
    enqueue('js_error', { err: String(e.message || 'error').slice(0, 120), src: src, line: e.lineno || 0 });
  });
  window.addEventListener('unhandledrejection', function (e) {
    if (!pv || counts.err++ >= 5) return;
    enqueue('js_error', { err: ('unhandledrejection: ' + (e.reason && e.reason.message || e.reason || '')).slice(0, 120), src: '', line: 0 });
  });
  if (window.fetch) {
    var origFetch = window.fetch;
    window.fetch = function (input) {
      var p = origFetch.apply(this, arguments);
      try {
        var t0 = performance.now(), raw = typeof input === 'string' ? input : (input && input.url) || '', u = new URL(raw, location.href);
        if (u.origin === location.origin && u.pathname.indexOf('/api/') === 0 && u.pathname.indexOf('/api/intel') !== 0 && pv) {
          var rec = function (status) {
            var ms = Math.round(performance.now() - t0);
            if (status === 0 || status >= 400) enqueue('request_failed', { url: u.pathname.slice(0, 100), status: status, ms: ms });
            else if (counts.req++ < 5) enqueue('request_timing', { url: u.pathname.slice(0, 100), status: status, ms: ms });
          };
          p.then(function (r) { rec(r.status); }, function () { rec(0); });
        }
      } catch (e) { /* ignore */ }
      return p;
    };
  }

  // ── web vitals (initial page load only) ───────────────────────────────────────────────────────
  var vitals = { LCP: 0, CLS: 0, INP: 0 }, vitalsSent = false;
  try {
    new PerformanceObserver(function (l) { var e = l.getEntries(); if (e.length) vitals.LCP = e[e.length - 1].startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    var cur = 0, first = 0, last = 0;
    new PerformanceObserver(function (l) {
      l.getEntries().forEach(function (e) {
        if (e.hadRecentInput) return;
        if (cur && e.startTime - last < 1000 && e.startTime - first < 5000) cur += e.value; else { cur = e.value; first = e.startTime; }
        last = e.startTime; if (cur > vitals.CLS) vitals.CLS = cur;
      });
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { if (e.interactionId && e.duration > vitals.INP) vitals.INP = e.duration; }); }).observe({ type: 'event', durationThreshold: 40, buffered: true });
  } catch (e) { /* unsupported browser: that vital is simply not reported */ }
  function sendVitals() {
    if (vitalsSent || !pv) return;
    vitalsSent = true;
    var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    if (vitals.LCP) enqueue('web_vital', { metric: 'LCP', val: Math.round(vitals.LCP) });
    enqueue('web_vital', { metric: 'CLS', val: Math.round(vitals.CLS * 1000) / 1000 });
    if (vitals.INP) enqueue('web_vital', { metric: 'INP', val: Math.round(vitals.INP) });
    if (nav) { enqueue('web_vital', { metric: 'TTFB', val: Math.round(nav.responseStart) }); enqueue('web_vital', { metric: 'LOAD', val: Math.round(nav.loadEventEnd || nav.domComplete) }); }
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────────────────────────
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { tick(); sendVitals(); heartbeat('engagement_heartbeat'); flush(true); }
    else { lastTick = performance.now(); ensureIds(); }
  });
  window.addEventListener('pagehide', function (e) {
    sendVitals(); endPageview(); flush(true);
    if (e.persisted) pv = null;
  });
  window.addEventListener('pageshow', function (e) { if (e.persisted && !pv) { startPageview(false); } }); // back/forward cache restore = new page view
  window.addEventListener('online', function () { nextTry = 0; flush(false); });

  // SPA navigation (Next.js App Router uses history.pushState)
  var lastUrl = location.pathname + location.search;
  function onUrl() {
    var now = location.pathname + location.search;
    if (now === lastUrl) return;
    var from = lastUrl; lastUrl = now;
    endPageview(); flush(false); startPageview(true, from);
  }
  ['pushState', 'replaceState'].forEach(function (m) {
    var o = history[m];
    history[m] = function () { var r = o.apply(this, arguments); setTimeout(onUrl, 0); return r; };
  });
  window.addEventListener('popstate', function () { setTimeout(onUrl, 0); });

  // ── consent UI (only in opt_in mode) ──────────────────────────────────────────────────────────
  function banner() {
    if (document.getElementById('rs-consent')) return;
    var b = document.createElement('div');
    b.id = 'rs-consent'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', 'Analytics preferences');
    b.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;max-width:560px;margin:auto;z-index:2147483000;background:#060297;color:#fff;border-radius:12px;padding:16px;font:14px/1.5 system-ui,sans-serif;box-shadow:0 8px 32px rgba(0,0,0,.3)';
    var p = document.createElement('p'); p.style.margin = '0 0 12px';
    p.textContent = 'We use privacy-friendly first-party analytics to see which pages help visitors. No ads tracking, no sale of data. ';
    var a = document.createElement('a'); a.href = '/privacy'; a.textContent = 'Privacy policy'; a.style.cssText = 'color:#FFB200;text-decoration:underline'; p.appendChild(a);
    var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
    function btn(txt, primary, fn) { var x = document.createElement('button'); x.type = 'button'; x.textContent = txt; x.style.cssText = 'cursor:pointer;border:0;border-radius:8px;padding:8px 16px;font:600 14px system-ui;' + (primary ? 'background:#FFB200;color:#060297' : 'background:transparent;color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.5)'); x.onclick = function () { fn(); b.remove(); }; return x; }
    row.appendChild(btn('Accept analytics', true, function () { api.consent(true); }));
    row.appendChild(btn('Decline', false, function () { api.consent(false); }));
    b.appendChild(p); b.appendChild(row); document.body.appendChild(b);
  }

  var api = window.RaveIntel = {
    track: function (name, props) { if (/^[a-z0-9_]{2,28}$/.test(name)) enqueue('custom_' + name, props); },
    consent: function (granted) {
      consent = granted ? 'granted' : 'denied'; ls('rs_consent', consent);
      try { window.dispatchEvent(new Event('rs-consent')); } catch (e) {}
      if (granted) { if (!pv) { startPageview(false); startTimers(); } }
      else { queue = []; ['rs_vid', 'rs_sess'].forEach(function (k) { ls(k, null); }); cookie('rs_vid', '', 0); cookie('rs_sid', '', 0); }
    }
  };

  function boot() {
    if (MODE === 'opt_in' && consent === null) { banner(); return; }
    if (blocked()) return;
    startPageview(false); startTimers();
  }
  if (document.prerendering) document.addEventListener('prerenderingchange', boot, { once: true });
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
