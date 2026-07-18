/// <reference path="../pb_data/types.d.ts" />

// Make a fresh installation immediately configurable without replaying the
// historical one-off setup scripts. Existing installations keep their current
// registration and iCal risk choices.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("site_config")

  const ensureTextField = (name, max) => {
    if (collection.fields.getByName(name)) return
    collection.fields.add(new TextField({
      name,
      max,
      required: false,
    }))
  }

  ensureTextField("instance_name", 120)
  ensureTextField("operator_name", 120)
  ensureTextField("operator_contact_email", 254)
  ensureTextField("source_code_url", 500)
  ensureTextField("legal_notice_url", 500)
  if (!collection.fields.getByName("initialization_complete")) {
    collection.fields.add(new BoolField({
      name: "initialization_complete",
      required: false,
    }))
  }
  if (!collection.fields.getByName("initialization_stage")) {
    collection.fields.add(new NumberField({
      name: "initialization_stage",
      min: 0,
      max: 4,
      onlyInt: true,
      required: false,
    }))
  }
  app.save(collection)

  const records = app.findRecordsByFilter(
    "site_config",
    'id != ""',
    "created",
    0,
    0,
  )

  let config
  if (records.length === 0) {
    config = new Record(collection)
    config.set("registration_open", false)
    config.set("require_invite", true)
    config.set("allowed_email_suffixes", "")
    config.set("site_notice", "")
    config.set("ical_risk_enabled", true)
    config.set("ical_rate_limit_enabled", true)
    config.set("ical_ip_anomaly_enabled", true)
    config.set("ical_rate_window_minutes", 10)
    config.set("ical_rate_max_requests", 5)
    config.set("ical_suspicious_ip_prefixes", 4)
    config.set("ical_revoke_ip_prefixes", 6)
    config.set("ical_suspicious_grace_hours", 48)
    config.set("ical_empty_calendar_hours", 48)
    config.set("initialization_complete", false)
    config.set("initialization_stage", 0)
  } else {
    config = records[0]
  }

  if (!config.getString("instance_name")) {
    config.set("instance_name", "Timetable Toolkit for XJTLU Students")
  }
  if (!config.getString("source_code_url")) {
    config.set(
      "source_code_url",
      "https://github.com/GeniusLv2006/xjtlu-timetable",
    )
  }
  app.save(config)

  // site_config is a singleton. Historical setup scripts could create more
  // than one record; preserve the oldest record and remove ambiguous extras.
  for (let i = 1; i < records.length; i += 1) {
    app.delete(records[i])
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("site_config")
  for (const name of [
    "instance_name",
    "operator_name",
    "operator_contact_email",
    "source_code_url",
    "legal_notice_url",
    "initialization_complete",
    "initialization_stage",
  ]) {
    const field = collection.fields.getByName(name)
    if (field) collection.fields.removeById(field.id)
  }
  app.save(collection)
})
