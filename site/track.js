/* Street Hustle Gang — ad + analytics tracking.
   IDs come from Netlify env vars (GA4_ID, META_PIXEL_ID, TIKTOK_PIXEL_ID) via /api/config.
   Any ID left blank = that platform never loads. Events: page_view, play_start, view_cash_shop,
   install_click, install_pwa, begin_checkout, purchase. */
(function () {
  var q = [], ready = false, C = {};
  window.shTrack = function (ev, p) { ready ? send(ev, p || {}) : q.push([ev, p || {}]); };

  function load(src) { var s = document.createElement('script'); s.async = true; s.src = src; document.head.appendChild(s); }

  function send(ev, p) {
    try {
      if (C.ga && window.gtag) gtag('event', ev, p);
      if (C.meta && window.fbq) {
        if (ev === 'purchase') fbq('track', 'Purchase', { value: p.value || 0, currency: 'USD' });
        else if (ev === 'begin_checkout') fbq('track', 'InitiateCheckout');
        else if (ev === 'play_start') fbq('track', 'StartTrial');
        else if (ev === 'install_pwa') fbq('trackCustom', 'InstallApp');
        else fbq('trackCustom', ev);
      }
      if (C.tt && window.ttq) {
        if (ev === 'purchase') ttq.track('CompletePayment', { value: p.value || 0, currency: 'USD', content_type: 'product', content_id: p.pack || 'cash' });
        else if (ev === 'begin_checkout') ttq.track('InitiateCheckout');
        else if (ev === 'play_start') ttq.track('ClickButton', { content_id: 'play_start' });
        else if (ev === 'install_pwa') ttq.track('Download');
        else ttq.track('ViewContent', { content_id: ev });
      }
    } catch (e) {}
  }

  fetch('/api/config').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }).then(function (c) {
    C = c || {};
    if (C.ga) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { dataLayer.push(arguments); };
      gtag('js', new Date()); gtag('config', C.ga);
      load('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(C.ga));
    }
    if (C.meta) {
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s) }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', C.meta); fbq('track', 'PageView');
    }
    if (C.tt) {
      !function (w, d, t) { w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || []; ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"], ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } }; for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]); ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e }, ttq.load = function (e, n) { var r = "https://analytics.tiktok.com/i18n/pixel/events.js"; ttq._i = ttq._i || {}, ttq._i[e] = [], ttq._i[e]._u = r, ttq._t = ttq._t || {}, ttq._t[e] = +new Date, ttq._o = ttq._o || {}, ttq._o[e] = n || {}; var o = document.createElement("script"); o.type = "text/javascript", o.async = !0, o.src = r + "?sdkid=" + e + "&lib=" + t; var a = document.getElementsByTagName("script")[0]; a.parentNode.insertBefore(o, a) }; ttq.load(C.tt); ttq.page(); }(window, document, 'ttq');
    }
    ready = true;
    // purchase return from Stripe (query captured before the game strips it)
    try {
      var qs = new URLSearchParams(window.__SH_QS || location.search);
      if (qs.has('paid')) {
        var key = 'sh_px_' + qs.get('paid');
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, '1');
          q.push(['purchase', { value: (parseInt(qs.get('v'), 10) || 0) / 100, pack: qs.get('pk') || '', transaction_id: qs.get('paid') }]);
        }
      }
    } catch (e) {}
    while (q.length) { var x = q.shift(); send(x[0], x[1]); }
  });
})();
