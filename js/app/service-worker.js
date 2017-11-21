this.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open('v1').then(function(cache) {
      return cache.addAll([
        '/',
        '/index.html',
        '/build',
        '/build/app.min.js',
        '/build/make8bitart.min.css',
        '/assets/bg.png',
        '/assets/copy.png',
        '/assets/cut.png',
        '/assets/dropper.png',
        '/assets/favicon.png',
        '/assets/hsl-palette.png',
        '/assets/paint.png',
        '/assets/paste-disabled.png',
        '/assets/paste.png',
        '/assets/pencil.png',
        '/assets/example.csv',
        '/assets/draggybits/dragger.png',
        '/assets/draggybits/hider.png',
        '/assets/fonts/8bit-Art-Sans.eot',
        '/assets/fonts/8bit-Art-Sans.svg',
        '/assets/fonts/8bit-Art-Sans.ttf',
        '/assets/fonts/8bit-Art-Sans.woff',
        '/assets/fonts/VT323-Regular.ttf',
      ]);
    })
  );
});

this.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(resp) {
      return resp || fetch(event.request).then(function(response) {
        return caches.open('v1').then(function(cache) {
          cache.put(event.request, response.clone());
          return response;
        });
      });
    })
  );
});
