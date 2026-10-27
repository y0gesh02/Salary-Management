# Routing constraint: only browser page loads fall through to the React app.
# API calls and non-HTML requests must get a real 404 instead of the SPA shell.
module SpaRequest
  def self.matches?(request)
    request.format.html? && !request.path.start_with?("/api")
  end
end
