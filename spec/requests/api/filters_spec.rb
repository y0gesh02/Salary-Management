require "rails_helper"

RSpec.describe "Filters API" do
  before { sign_in(create(:user)) }

  it "lists the options the directory filters and the forms offer" do
    create(:employee, department: "Sales", job_title: "Account Executive")
    create(:employee, department: "Engineering", job_title: "Software Engineer")
    create(:employee, department: "Sales", job_title: "Account Executive")

    get "/api/filters"

    body = response.parsed_body
    expect(body["countries"]).to include("code" => "IN", "name" => "India", "currency" => "INR")
    expect(body["departments"]).to eq(%w[Engineering Sales])
    expect(body["job_titles"]).to eq([ "Account Executive", "Software Engineer" ])
    expect(body["currencies"]).to include("INR", "USD")
    expect(body["periods"]).to eq(%w[annual monthly])
  end
end
