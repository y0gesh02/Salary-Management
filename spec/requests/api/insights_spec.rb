require "rails_helper"

RSpec.describe "Insights API" do
  before { sign_in(create(:user)) }

  def employee(amount:, **attributes)
    create(:employee, hire_date: Date.new(2020, 1, 1), **attributes).tap do |created|
      create(:salary_record, employee: created, amount:, currency: Country.find(created.country_code).currency,
                             effective_date: Date.new(2020, 1, 1))
    end
  end

  it "returns salary statistics per group, with money as decimal strings" do
    employee(amount: 100, country_code: "IN")
    employee(amount: 201, country_code: "IN")

    get "/api/insights/salaries", params: { group_by: "country" }

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to include("group_by" => "country", "as_of" => Date.current.iso8601)
    expect(response.parsed_body["data"].sole).to eq(
      "group" => { "key" => "IN", "label" => "India" }, "currency" => "INR", "headcount" => 2,
      "min" => "100.0", "max" => "201.0", "average" => "150.5", "median" => "150.5", "total" => "301.0"
    )
  end

  it "applies filters" do
    employee(amount: 100, country_code: "IN", department: "Sales")
    employee(amount: 900, country_code: "IN", department: "Engineering")

    get "/api/insights/salaries", params: { group_by: "department", department: "Sales" }

    expect(response.parsed_body["data"].map { _1["group"]["key"] }).to eq([ "Sales" ])
  end

  it "groups by country when no grouping is given" do
    get "/api/insights/salaries"

    expect(response.parsed_body["group_by"]).to eq("country")
  end

  it "answers 400 for an unknown grouping" do
    get "/api/insights/salaries", params: { group_by: "email" }

    expect(response).to have_http_status(:bad_request)
    expect(response.parsed_body).to eq("error" => "group_by must be one of: country, department, job_title")
  end
end
