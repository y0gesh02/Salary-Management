require "rails_helper"

RSpec.describe Employees::Create do
  let(:profile) do
    { full_name: "Priya Sharma", email: "priya@acme.test", job_title: "Software Engineer",
      department: "Engineering", country_code: "IN", hire_date: "2024-03-01" }
  end
  let(:initial_salary) { { amount: "1800000", currency: "INR", period: "annual" } }

  it "creates the employee and their first salary, effective from the hire date" do
    result = described_class.call(**profile, initial_salary:)

    expect(result).to be_success
    expect(result.employee).to be_persisted
    expect(result.employee.salary_records.sole).to have_attributes(
      amount: 1_800_000, currency: "INR", period: "annual", effective_date: Date.new(2024, 3, 1)
    )
  end

  it "creates nothing when the salary is invalid, and reports the salary errors by field" do
    result = nil

    expect {
      result = described_class.call(**profile, initial_salary: initial_salary.merge(amount: "-5"))
    }.not_to change(Employee, :count)

    expect(result).not_to be_success
    expect(result.errors).to eq("initial_salary.amount" => [ "must be greater than 0" ])
  end

  it "requires an initial salary" do
    result = described_class.call(**profile, initial_salary: nil)

    expect(result).not_to be_success
    expect(result.errors).to include("initial_salary" => [ "can't be blank" ])
  end

  it "reports profile and salary errors together, so the form can show them all at once" do
    result = described_class.call(**profile, email: "", initial_salary: initial_salary.merge(currency: "XYZ"))

    expect(result.errors).to include(
      "email" => [ "can't be blank" ],
      "initial_salary.currency" => [ "is not a supported currency" ]
    )
  end
end
