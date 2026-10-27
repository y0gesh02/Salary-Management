FactoryBot.define do
  factory :salary_record do
    employee
    amount { 1_200_000 }
    currency { "INR" }
    period { "annual" }
    effective_date { employee.hire_date }
  end
end
