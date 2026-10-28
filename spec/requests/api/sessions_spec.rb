require "rails_helper"

RSpec.describe "Session API" do
  let!(:hr_manager) { create(:user, email: "hr@incubyte.test") }

  describe "GET /api/session" do
    it "reports no user before login, and hands out a CSRF token for the login form" do
      get "/api/session"

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to include("user" => nil, "csrf_token" => be_present)
    end
  end

  describe "POST /api/session" do
    it "logs the HR manager in" do
      sign_in(hr_manager)

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["user"]).to eq("email" => "hr@incubyte.test")

      get "/api/session"
      expect(response.parsed_body["user"]).to eq("email" => "hr@incubyte.test")
    end

    it "accepts the email in any case" do
      post "/api/session", params: { email: "HR@Incubyte.Test", password: "correct-horse-battery" }, as: :json

      expect(response).to have_http_status(:ok)
    end

    it "rejects a wrong password" do
      sign_in(hr_manager, password: "wrong-password")

      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body).to eq("error" => "Invalid email or password")
    end

    it "gives the same answer for an unknown email, so it doesn't reveal which accounts exist" do
      post "/api/session", params: { email: "nobody@incubyte.test", password: "whatever-password" }, as: :json

      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body).to eq("error" => "Invalid email or password")
    end

    it "slows down password guessing by rate-limiting attempts" do
      10.times { sign_in(hr_manager, password: "wrong-password") }

      sign_in(hr_manager)

      expect(response).to have_http_status(:too_many_requests)
      expect(response.parsed_body).to eq("error" => "Too many login attempts. Try again in a few minutes.")
    end
  end

  describe "DELETE /api/session" do
    it "logs the HR manager out" do
      sign_in(hr_manager)

      delete "/api/session"

      expect(response).to have_http_status(:no_content)
      get "/api/session"
      expect(response.parsed_body["user"]).to be_nil
    end
  end

  describe "CSRF protection" do
    around do |example|
      ActionController::Base.allow_forgery_protection = true
      example.run
    ensure
      ActionController::Base.allow_forgery_protection = false
    end

    it "rejects a state-changing request without the CSRF token" do
      post "/api/session", params: { email: "hr@incubyte.test", password: "correct-horse-battery" }, as: :json

      expect(response).to have_http_status(:forbidden)
      expect(response.parsed_body).to eq("error" => "Invalid or missing CSRF token")
    end

    it "accepts the request with the token from GET /api/session" do
      get "/api/session"
      token = response.parsed_body["csrf_token"]

      post "/api/session", params: { email: "hr@incubyte.test", password: "correct-horse-battery" },
                           headers: { "X-CSRF-Token" => token }, as: :json

      expect(response).to have_http_status(:ok)
    end
  end
end
