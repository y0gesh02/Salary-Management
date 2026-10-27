# The session cookie is the HR Manager's login. HttpOnly (Rails default) keeps it
# away from JavaScript; SameSite=Lax stops it being sent on cross-site POSTs;
# it expires after a working day so an unattended browser doesn't stay logged in.
Rails.application.config.session_store :cookie_store,
  key: "_acme_salary_session",
  same_site: :lax,
  secure: Rails.env.production?,
  expire_after: 12.hours
