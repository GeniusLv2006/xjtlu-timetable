// Keep user auth identities canonical and private without exposing a public
// account-enumeration endpoint.
var normalizeUserEmail = function(e) {
  var email = (e.record.getString('email') || '').trim().toLowerCase()
  if (email) e.record.set('email', email)
  e.record.set('emailVisibility', false)
  e.next()
}

onRecordCreateRequest(normalizeUserEmail, 'users')
onRecordUpdateRequest(normalizeUserEmail, 'users')
