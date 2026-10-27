require "rails_helper"

RSpec.describe Employee do
  it "is valid with all required attributes" do
    expect(build(:employee)).to be_valid
  end

  %i[full_name email job_title department country_code hire_date].each do |attribute|
    it "requires #{attribute}" do
      employee = build(:employee, attribute => nil)

      expect(employee).not_to be_valid
      expect(employee.errors[attribute]).to include("can't be blank")
    end
  end

  describe "email" do
    it "is normalized so the same address can't be entered twice in different cases" do
      employee = create(:employee, email: "  Priya.Sharma@ACME.test ")

      expect(employee.email).to eq("priya.sharma@acme.test")
    end

    it "must be unique, ignoring case" do
      create(:employee, email: "priya@acme.test")
      duplicate = build(:employee, email: "PRIYA@acme.test")

      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:email]).to include("has already been taken")
    end

    it "must look like an email address" do
      employee = build(:employee, email: "not-an-email")

      expect(employee).not_to be_valid
      expect(employee.errors[:email]).to include("is invalid")
    end

    it "is also unique at the database level, so concurrent requests can't create duplicates" do
      create(:employee, email: "priya@acme.test")
      duplicate = build(:employee, email: "priya@acme.test")

      expect { duplicate.save(validate: false) }.to raise_error(ActiveRecord::RecordNotUnique)
    end
  end

  describe "country_code" do
    it "must be a supported country" do
      employee = build(:employee, country_code: "XX")

      expect(employee).not_to be_valid
      expect(employee.errors[:country_code]).to include("is not a supported country")
    end

    it "is normalized to upper case" do
      expect(build(:employee, country_code: "in").country_code).to eq("IN")
    end
  end

  it "trims surrounding whitespace from text fields" do
    employee = build(:employee, full_name: "  Priya Sharma ", job_title: " Engineer ", department: " Sales ")

    expect(employee).to have_attributes(full_name: "Priya Sharma", job_title: "Engineer", department: "Sales")
  end

  describe "#country" do
    it "returns the employee's country" do
      expect(build(:employee, country_code: "GB").country.name).to eq("United Kingdom")
    end
  end

  describe "#current_salary" do
    let(:employee) { create(:employee, hire_date: Date.new(2022, 1, 1)) }

    it "is the salary record in effect on the given date" do
      create(:salary_record, employee:, effective_date: Date.new(2022, 1, 1), amount: 100)
      raise_2024 = create(:salary_record, employee:, effective_date: Date.new(2024, 4, 1), amount: 200)
      create(:salary_record, employee:, effective_date: Date.new(2026, 1, 1), amount: 300)

      expect(employee.current_salary(as_of: Date.new(2025, 6, 15))).to eq(raise_2024)
    end

    it "defaults to today" do
      past = create(:salary_record, employee:, effective_date: Date.new(2022, 1, 1))
      create(:salary_record, employee:, effective_date: Date.current + 1)

      expect(employee.current_salary).to eq(past)
    end

    it "is nil before any salary has taken effect" do
      expect(employee.current_salary(as_of: Date.new(2025, 6, 15))).to be_nil
    end
  end
end
