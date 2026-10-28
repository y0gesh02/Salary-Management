require "rails_helper"

RSpec.describe User do
  it "is valid with an email and a password" do
    expect(build(:user)).to be_valid
  end

  it "normalizes the email so login is case-insensitive" do
    expect(create(:user, email: " HR@Incubyte.test ").email).to eq("hr@incubyte.test")
  end

  it "requires a unique email" do
    create(:user, email: "hr@incubyte.test")

    expect(build(:user, email: "hr@incubyte.test")).not_to be_valid
  end

  it "requires a password of at least 12 characters" do
    user = build(:user, password: "short-pass")

    expect(user).not_to be_valid
    expect(user.errors[:password]).to include("is too short (minimum is 12 characters)")
  end

  it "never stores the password in plain text" do
    user = create(:user, password: "correct-horse-battery")

    expect(user.password_digest).not_to include("correct-horse-battery")
  end
end
