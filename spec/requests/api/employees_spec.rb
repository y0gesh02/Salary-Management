require "rails_helper"

RSpec.describe "Employees API" do
  let(:hr_manager) { create(:user) }

  before { sign_in(hr_manager) }

  describe "GET /api/employees" do
    it "lists employees with their current salary and pagination info" do
      priya = create(:employee, full_name: "Priya Sharma", country_code: "IN", hire_date: Date.new(2022, 1, 1))
      create(:salary_record, employee: priya, amount: "1234567.89", currency: "INR", period: "annual",
                             effective_date: Date.new(2022, 1, 1))

      get "/api/employees"

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["meta"]).to eq("page" => 1, "per_page" => 25, "total" => 1)
      expect(response.parsed_body["data"].sole).to include(
        "id" => priya.id,
        "full_name" => "Priya Sharma",
        "country" => { "code" => "IN", "name" => "India" },
        "current_salary" => include(
          "amount" => "1234567.89", "currency" => "INR", "period" => "annual", "annual_amount" => "1234567.89"
        )
      )
    end

    it "passes search, filter, sort and pagination parameters through" do
      create(:employee, full_name: "Priya Sharma", country_code: "IN")
      create(:employee, full_name: "Priya Verma", country_code: "IN")
      create(:employee, full_name: "Priya Jones", country_code: "US")

      get "/api/employees", params: { q: "priya", country: "IN", sort: "-full_name", per_page: 1 }

      expect(response.parsed_body["data"].map { _1["full_name"] }).to eq([ "Priya Verma" ])
      expect(response.parsed_body["meta"]["total"]).to eq(2)
    end

    it "requires login" do
      delete "/api/session"

      get "/api/employees"

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "GET /api/employees/:id" do
    let(:employee) { create(:employee, hire_date: Date.new(2022, 1, 1)) }

    it "shows the employee with their full salary history, newest first, each labelled" do
      create(:salary_record, employee:, amount: 100_000, period: "monthly", effective_date: Date.new(2022, 1, 1))
      create(:salary_record, employee:, amount: 110_000, period: "monthly", effective_date: Date.current - 30)
      create(:salary_record, employee:, amount: 120_000, period: "monthly", effective_date: Date.current + 30)

      get "/api/employees/#{employee.id}"

      body = response.parsed_body
      expect(body["current_salary"]).to include("amount" => "110000.0", "annual_amount" => "1320000.0")
      expect(body["salary_history"].map { _1.values_at("amount", "status") }).to eq([
        [ "120000.0", "scheduled" ],
        [ "110000.0", "current" ],
        [ "100000.0", "past" ]
      ])
    end

    it "returns 404 for an unknown employee" do
      get "/api/employees/0"

      expect(response).to have_http_status(:not_found)
      expect(response.parsed_body).to eq("error" => "Not found")
    end
  end
end
