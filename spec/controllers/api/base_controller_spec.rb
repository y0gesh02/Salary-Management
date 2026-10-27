require "rails_helper"

# Every API controller inherits from Api::BaseController, so login is required
# unless a controller explicitly opts out (only the session endpoint does).
RSpec.describe Api::BaseController do
  controller(described_class) do
    def index = render(json: { secret: "payroll" })
  end

  it "rejects requests from someone who is not logged in" do
    get :index

    expect(response).to have_http_status(:unauthorized)
    expect(response.parsed_body).to eq("error" => "Not logged in")
  end

  it "allows requests from the logged-in HR manager" do
    user = create(:user)

    get :index, session: { user_id: user.id }

    expect(response).to have_http_status(:ok)
  end

  it "treats a session for a user that no longer exists as logged out" do
    get :index, session: { user_id: -1 }

    expect(response).to have_http_status(:unauthorized)
  end
end
