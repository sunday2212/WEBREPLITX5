const CACHE_NAME = 'nextpulse-v92';
const urlsToCache = [
  './',
  './index.html',
  './splash.html',
  './appx.html',
  './00x1234.html',
  './search.html',
  './styles.css',
  './script.js',
  './access-control.js',
  './pwa-handler.js',
  './app.webmanifest',
  './iconss-192.png',
  './iconss-512.png',
  './platforms/marrow/marrow-subjects.html',
  './platforms/dams/dams-subjects.html',
  './platforms/prepladder/prepladder-subjects.html',
  './quiz/index.html',
  './quiz/appx.html',
  './quiz/00x1234.html',
  './quiz/bookmarks.html',
  './quiz/qbank-main.css'
];

/* ─── Tiny theme-init snippet injected into every HTML response ─── */
const THEME_SNIPPET = '<script>!function(){var t=localStorage.getItem("theme")||"dark";if(t==="light")document.documentElement.setAttribute("data-theme","light");}();<\/script>';

async function injectThemeScript(response) {
  try {
    const ct = response.headers.get('content-type') || '';
    if (!ct.includes('text/html')) return response;

    const text = await response.text();
    if (text.includes('theme.js') || text.includes('_theme') || text.includes('"theme")||"dark"')) {
      return new Response(text, { status: response.status, statusText: response.statusText, headers: buildHeaders(response) });
    }
    const modified = text.replace(/<head>/i, '<head>' + THEME_SNIPPET);
    return new Response(modified, { status: response.status, statusText: response.statusText, headers: buildHeaders(response) });
  } catch (e) {
    return response;
  }
}

function buildHeaders(response) {
  const h = new Headers();
  response.headers.forEach((v, k) => h.set(k, v));
  h.set('content-type', 'text/html; charset=utf-8');
  return h;
}

/* ─── Bot detection ─── */
const botUserAgents = [
  'Googlebot','Bingbot','Slurp','DuckDuckBot','Baiduspider','YandexBot',
  'facebookexternalhit','twitterbot','rogerbot','linkedinbot','embedly',
  'quora link preview','showyoubot','outbrain','pinterest',
  'developers.google.com/+/web/snippet','www.google.com/webmasters/tools/richsnippets',
  'slackbot','vkShare','W3C_Validator','redditbot','Applebot','WhatsApp',
  'flipboard','tumblr','bitlybot','SkypeUriPreview','nuzzel','Discordbot',
  'Google Page Speed','Qwantify','pinterestbot','Bitrix link preview',
  'XING-contenttabreceiver','Chrome-Lighthouse','TelegramBot',
  'Google-Ads-Overview','Google-Adwords','Google-Site-Verification'
];

function isBot(userAgent) {
  if (!userAgent) return false;
  return botUserAgents.some(bot => userAgent.toLowerCase().includes(bot.toLowerCase()));
}

/* ─── Install ─── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

/* ─── Fetch ─── */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const userAgent = event.request.headers.get('user-agent') || '';

  if (isBot(userAgent)) {
    event.respondWith(
      caches.match(event.request).then(r => r || fetch(event.request))
    );
    return;
  }

  const isHtml = url.pathname.endsWith('.html') || url.pathname.endsWith('/') || url.pathname === '';

  event.respondWith(
    caches.match(event.request)
      .then(async (cached) => {
        const response = cached || await fetch(event.request);
        if (isHtml) {
          return injectThemeScript(response.clone());
        }
        return response;
      })
  );
});

/* ─── Activate ─── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.map(n => n !== CACHE_NAME && caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

/* ═══════════════════════════════════════════════════════════════
   PUSH NOTIFICATIONS
═══════════════════════════════════════════════════════════════ */

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: 'NextPulse', body: event.data ? event.data.text() : 'New update!' };
  }

  const title   = data.title  || 'NextPulse';
  const options = {
    body:            data.body   || '',
    icon:            data.icon   || '/iconss-192.png',
    badge:           data.badge  || '/iconss-192.png',
    data:            { url: data.url || '/appx.html' },
    vibrate:         [200, 100, 200],
    requireInteraction: false,
    tag:             'nextpulse-notification',
    renotify:        true
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/* ─── Notification click → open / focus the target URL ─── */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/appx.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Try to focus an already-open tab with this URL
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
