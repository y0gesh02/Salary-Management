FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "hr#{n}@acme.test" }
    password { "correct-horse-battery" }
  end
end
