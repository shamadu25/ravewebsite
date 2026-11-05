/* eslint-disable */
/*! RaveSoft: optional PostHog loader (session replay + heatmaps). Runs only when NEXT_PUBLIC_POSTHOG_KEY is set, honours the same consent /
 *  Do-Not-Track / Global-Privacy-Control rules as rs-intel.js, masks every input, and never loads on /admin or /pay (not mounted there). */
(function () {
  'use strict';
  var s = document.currentScript || document.querySelector('script[src*="rs-posthog.js"]');
  if (!s || window.__rsPh) return;
  var key = s.getAttribute('data-key'), host = (s.getAttribute('data-host') || 'https://us.i.posthog.com').replace(/\/$/, ''), mode = s.getAttribute('data-consent-mode');
  if (!key || !/^https:\/\/[\w.-]+$/.test(host)) return;
  function allowed() {
    var c = null, ig = null; try { c = localStorage.getItem('rs_consent'); ig = localStorage.getItem('rs_ignore'); } catch (e) {}
    if (ig === '1' || c === 'denied' || navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true || navigator.webdriver === true) return false;
    return mode === 'opt_in' ? c === 'granted' : true;
  }
  function load() {
    if (window.__rsPh || !allowed()) return; window.__rsPh = true;
    var p = document.createElement('script'); p.async = true; p.src = host.replace('.i.posthog.com', '-assets.i.posthog.com') + '/static/array.js';
    p.onload = function () {
      if (!window.posthog || !window.posthog.init) return;
      window.posthog.init(key, {
        api_host: host, person_profiles: 'identified_only', autocapture: false, capture_pageview: 'history_change', enable_heatmaps: true,
        disable_session_recording: false, respect_dnt: true,
        session_recording: { maskAllInputs: true, maskTextSelector: '[data-rs-mask]', blockSelector: '[data-rs-block]', recordCrossOriginIframes: false },
        persistence: 'localStorage', disable_surveys: true
      });
    };
    document.head.appendChild(p);
  }
  window.addEventListener('rs-consent', load);
  load();
})();
