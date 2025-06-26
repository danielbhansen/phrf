const phrfApp = "phrf-v2.2025.2"
const assets = [
  "https://danielbhansen.github.io/phrf/index.html",
  "https://danielbhansen.github.io/phrf/style.css",
  "https://danielbhansen.github.io/phrf/script.js",
  "https://danielbhansen.github.io/phrf/icon.png",
  "https://danielbhansen.github.io/phrf/sw.js",
  "https://danielbhansen.github.io/phrf/inshore.json"
]

self.addEventListener("install", installEvent => {
  installEvent.waitUntil(
    caches.open(phrfApp).then(cache => {
      cache.addAll(assets)
    })
  )
})

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== phrfApp) {
          return caches.delete(key);
        }
      })
    ))
  )
})

self.addEventListener("fetch", fetchEvent => {
    fetchEvent.respondWith(
      caches.match(fetchEvent.request).then(res => {
        return res || fetch(fetchEvent.request)
      })
    )
  })