import PocketBase, { LocalAuthStore } from 'pocketbase'

// Separate PocketBase instance exclusively for admin operations.
// Uses its own LocalAuthStore key so the admin token never overwrites
// the user session stored under the default 'pocketbase_auth' key.
const adminPb = new PocketBase(
  import.meta.env.DEV ? 'http://localhost:8091' : window.location.origin,
  new LocalAuthStore('pb_admin_auth')
)

export default adminPb
