# Serves the compiled React app for client-side routes (e.g. a refresh on
# /employees/42), so deep links work without Rails knowing the UI's routes.
class SpaController < ApplicationController
  def index
    index_path = Rails.configuration.x.spa_index_path

    if File.exist?(index_path)
      render file: index_path, layout: false, content_type: "text/html"
    else
      render plain: "Frontend not built. Run `npm run build` in frontend/.", status: :service_unavailable
    end
  end
end
