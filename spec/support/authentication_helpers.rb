module AuthenticationHelpers
  def sign_in(user, password: "correct-horse-battery")
    post "/api/session", params: { email: user.email, password: }, as: :json
  end
end

RSpec.configure do |config|
  config.include AuthenticationHelpers, type: :request
  # Rate limiting counts requests in Rails.cache; start every example from zero.
  config.before { Rails.cache.clear }
end
