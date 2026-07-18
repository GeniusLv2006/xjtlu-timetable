/// <reference path="../pb_data/types.d.ts" />

// Keep email addresses private and limit user profile reads to the account
// owner or users connected through a friendship record.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  users.viewRule = [
    '@request.auth.is_banned != true',
    '&&',
    '(',
    'id = @request.auth.id',
    '|| (@collection.friendships.from_user.id ?= @request.auth.id',
    '&& @collection.friendships.to_user.id ?= id)',
    '|| (@collection.friendships.to_user.id ?= @request.auth.id',
    '&& @collection.friendships.from_user.id ?= id)',
    ')',
  ].join(" ")
  app.save(users)

  app.db()
    .newQuery("UPDATE users SET emailVisibility = false WHERE emailVisibility = true")
    .execute()
}, (app) => {
  // Privacy migrations intentionally do not restore public email visibility.
})
