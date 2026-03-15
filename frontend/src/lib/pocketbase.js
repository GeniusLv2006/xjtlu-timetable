import PocketBase from 'pocketbase'

// In dev, Vite proxies /api → http://localhost:8091
// In production, PocketBase serves frontend itself, so same origin
const pb = new PocketBase(
  import.meta.env.DEV ? 'http://localhost:8091' : window.location.origin
)

export default pb
