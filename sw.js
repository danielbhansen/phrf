const phrfApp = "phrf-v1"
const assets = [
  "https://tbyc.on.ca/phrf/",
  "https://tbyc.on.ca/phrf/index.html",
  "https://tbyc.on.ca/phrf/style.css",
  "https://tbyc.on.ca/phrf/script.js",
  "https://tbyc.on.ca/phrf/icon.png",
  "https://tbyc.on.ca/phrf/boats.json"
]

self.addEventListener("install", installEvent => {
  installEvent.waitUntil(
    caches.open(phrfApp).then(cache => {
      cache.addAll(assets)
    })
  )
})

self.addEventListener("fetch", fetchEvent => {
    fetchEvent.respondWith(
      caches.match(fetchEvent.request).then(res => {
        return res || fetch(fetchEvent.request)
      })
    )
  })