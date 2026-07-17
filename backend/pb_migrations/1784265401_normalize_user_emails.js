/// <reference path="../pb_data/types.d.ts" />
// Normalize auth identities so case-insensitive login does not require a
// public endpoint that discloses whether an email address is registered.
migrate((app) => {
  const duplicates = arrayOf(new DynamicModel({ email: "", count: 0 }))
  app.db()
    .newQuery(`
      SELECT lower(email) AS email, count(*) AS count
      FROM users
      GROUP BY lower(email)
      HAVING count(*) > 1
    `)
    .all(duplicates)

  if (duplicates.length > 0) {
    throw new Error("Cannot normalize user emails: case-insensitive duplicates exist")
  }

  app.db()
    .newQuery("UPDATE users SET email = lower(email) WHERE email != lower(email)")
    .execute()
}, (app) => {
  // Lowercasing email identities is intentionally irreversible.
})
