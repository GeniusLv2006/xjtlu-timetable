import PocketBase from 'pocketbase'

// Separate PocketBase instance exclusively for admin operations.
// Uses pb.admins.authWithPassword() — tokens stored here never mix
// with the regular user session in lib/pocketbase.js.
const adminPb = new PocketBase(
  import.meta.env.DEV ? 'http://localhost:8091' : window.location.origin
)

export default adminPb
