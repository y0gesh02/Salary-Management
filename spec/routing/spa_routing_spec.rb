require "rails_helper"

# In a built app, public/index.html is served for "/" by the static file
# server before routing runs. This route covers the unbuilt case, so the
# root never falls through to Rails' default page.
RSpec.describe "SPA routing" do
  it "routes the root URL to the React app" do
    expect(get: "/").to route_to("spa#index")
  end
end
