// Keep all user auth identities canonical so login remains case-insensitive
// without exposing a public account-enumeration endpoint.
var normalizeUserEmail = function(e) {
  var email = (e.record.getString('email') || '').trim().toLowerCase()
  if (email) e.record.set('email', email)
  e.next()
}

onRecordCreateRequest(normalizeUserEmail, 'users')
onRecordUpdateRequest(normalizeUserEmail, 'users')
