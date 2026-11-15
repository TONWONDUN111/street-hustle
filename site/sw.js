/* Street Hustle Gang service worker
   - Game page (index.html): network first, so every deploy reaches players on their next launch; falls back to the saved copy offline.
   - Big assets (models, sounds, icons, three.js): served instantly from the phone's cache, refreshed in the background.
   Bump VERSION to force every player to re-download all assets. */
const VERSION = 'sh-v6';
const CORE = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png',
  'models/cars.js', 'models/people.js',
  'sounds/pistol.mp3', 'sounds/rifle.mp3', 'sounds/shotgun.mp3', 'sounds/heavy.mp3', 'sounds/boom.mp3', 'sounds/die.mp3', 'sounds/reload.mp3',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(CORE.map(u => c.add(new Request(u, { mode: u.startsWith('http') ? 'cors' : 'same-origin' })).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // leaderboard POSTs etc. go straight to the network
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !url.hostname.endsWith('cdnjs.cloudflare.com')) return;   // e.g. Supabase: never cached

  const isPage = req.mode === 'navigate' || (sameOrigin && (url.pathname === '/' || url.pathname.endsWith('/index.html')));
  if (isPage) {
    e.respondWith(fetch(req).then(r => {
      if (r.ok && (url.pathname === '/' || url.pathname.endsWith('/index.html'))) { const cp = r.clone(); caches.open(VERSION).then(c => c.put('index.html', cp)); }
      return r;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html')).then(r => r || caches.match('./'))));
    return;
  }
  // stale-while-revalidate for assets
  e.respondWith(caches.open(VERSION).then(c => c.match(req, { ignoreSearch: true }).then(hit => {
    const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  })));
});
