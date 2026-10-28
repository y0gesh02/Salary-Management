FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "hr#{n}@incubyte.test" }
    password { "correct-horse-battery" }
  end
end
