require "rails_helper"

RSpec.describe "SPA fallback" do
  around do |example|
    original = Rails.configuration.x.spa_index_path
    Rails.configuration.x.spa_index_path = file_fixture("spa_index.html")
    example.run
  ensure
    Rails.configuration.x.spa_index_path = original
  end

  it "serves the React app for client-side routes so deep links work" do
    get "/employees/42"

    expect(response).to have_http_status(:ok)
    expect(response.media_type).to eq("text/html")
    expect(response.body).to include("SPA shell")
  end

  it "does not swallow unknown API paths" do
    get "/api/does-not-exist"

    expect(response).to have_http_status(:not_found)
    expect(response.body).not_to include("SPA shell")
  end

  it "does not serve the app for non-HTML requests" do
    get "/employees/42", headers: { "Accept" => "application/json" }

    expect(response).to have_http_status(:not_found)
  end

  it "explains how to fix it when the frontend has not been built" do
    Rails.configuration.x.spa_index_path = Rails.root.join("tmp/missing-index.html")

    get "/employees"

    expect(response).to have_http_status(:service_unavailable)
    expect(response.body).to include("npm run build")
  end
end
