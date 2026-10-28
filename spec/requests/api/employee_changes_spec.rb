require "rails_helper"

RSpec.describe "Employee changes API" do
  before { sign_in(create(:user)) }

  let(:profile) do
    { full_name: "Priya Sharma", email: "priya@incubyte.test", job_title: "Software Engineer",
      department: "Engineering", country_code: "IN", hire_date: "2024-03-01" }
  end

  describe "POST /api/employees" do
    it "creates the employee with their first salary and returns the employee page data" do
      post "/api/employees",
           params: { employee: profile.merge(initial_salary: { amount: "1800000", currency: "INR", period: "annual" }) },
           as: :json

      expect(response).to have_http_status(:created)
      expect(response.parsed_body).to include("full_name" => "Priya Sharma",
                                              "current_salary" => include("amount" => "1800000.0"))
    end

    it "returns every validation error keyed by field" do
      post "/api/employees",
           params: { employee: profile.merge(full_name: "", initial_salary: { amount: "0", currency: "INR", period: "annual" }) },
           as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body).to eq("errors" => {
        "full_name" => [ "can't be blank" ],
        "initial_salary.amount" => [ "must be greater than 0" ]
      })
    end

    it "answers 400 when the request has no employee data at all" do
      post "/api/employees", params: { something: "else" }, as: :json

      expect(response).to have_http_status(:bad_request)
      expect(response.parsed_body["error"]).to match(/employee/)
    end
  end

  describe "PATCH /api/employees/:id" do
    let(:employee) { create(:employee, full_name: "Priya Sharma", hire_date: Date.new(2022, 1, 1)) }
    let!(:salary) { create(:salary_record, employee:, amount: 100) }

    it "updates the profile" do
      patch "/api/employees/#{employee.id}", params: { employee: { job_title: "Senior Software Engineer" } }, as: :json

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["job_title"]).to eq("Senior Software Engineer")
    end

    it "ignores salary fields: pay changes go through salary records, so history is kept" do
      patch "/api/employees/#{employee.id}", params: { employee: { amount: "999", initial_salary: { amount: "999" } } },
                                              as: :json

      expect(employee.reload.salary_records.sole.amount).to eq(100)
    end

    it "returns validation errors keyed by field" do
      patch "/api/employees/#{employee.id}", params: { employee: { email: "not-an-email" } }, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body).to eq("errors" => { "email" => [ "is invalid" ] })
    end
  end

  describe "DELETE /api/employees/:id" do
    it "deletes the employee and their salary history" do
      employee = create(:employee)
      create(:salary_record, employee:)

      delete "/api/employees/#{employee.id}"

      expect(response).to have_http_status(:no_content)
      expect(Employee.exists?(employee.id)).to be(false)
      expect(SalaryRecord.where(employee_id: employee.id)).to be_empty
    end
  end

  describe "POST /api/employees/:id/salary_records" do
    let(:employee) { create(:employee, hire_date: Date.new(2022, 1, 1)) }

    before { create(:salary_record, employee:, amount: 1_000_000, effective_date: Date.new(2022, 1, 1)) }

    it "records a raise as a new entry and keeps the earlier one" do
      post "/api/employees/#{employee.id}/salary_records",
           params: { salary_record: { amount: "1100000", currency: "INR", period: "annual", effective_date: Date.current.iso8601 } },
           as: :json

      expect(response).to have_http_status(:created)
      expect(response.parsed_body["current_salary"]).to include("amount" => "1100000.0")
      expect(response.parsed_body["salary_history"].map { _1["amount"] }).to eq(%w[1100000.0 1000000.0])
    end

    it "returns validation errors keyed by field" do
      post "/api/employees/#{employee.id}/salary_records",
           params: { salary_record: { amount: "", currency: "INR", period: "weekly", effective_date: "2021-01-01" } },
           as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body["errors"]).to eq(
        "amount" => [ "can't be blank" ],
        "period" => [ "is not included in the list" ],
        "effective_date" => [ "can't be before the hire date (2022-01-01)" ]
      )
    end

    it "returns 404 for an unknown employee" do
      post "/api/employees/0/salary_records", params: { salary_record: { amount: "1" } }, as: :json

      expect(response).to have_http_status(:not_found)
    end
  end
end
