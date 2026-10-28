FactoryBot.define do
  factory :employee do
    sequence(:full_name) { |n| "Employee #{n}" }
    sequence(:email) { |n| "employee#{n}@incubyte.test" }
    job_title { "Software Engineer" }
    department { "Engineering" }
    country_code { "IN" }
    hire_date { Date.new(2022, 1, 10) }
  end
end
