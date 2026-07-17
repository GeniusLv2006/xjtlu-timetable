// Hashed Vite assets are immutable; HTML must always revalidate so a client
// cannot keep referencing assets removed by a later deployment.
routerUse((e) => {
  var path = e.request.url ? e.request.url.path : ''

  if (/^\/assets\/.+-[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/.test(path)) {
    e.response.header().set(
      'Cache-Control',
      'public, max-age=31536000, immutable',
    )
  } else if (path === '/' || path.endsWith('.html')) {
    e.response.header().set('Cache-Control', 'no-cache')
  }

  return e.next()
})
