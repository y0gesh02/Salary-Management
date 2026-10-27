require "rails_helper"

RSpec.describe SalaryStatistics do
  let(:today) { Date.new(2025, 6, 15) }

  def statistics(group_by: "country", **filters)
    described_class.new(group_by:, filters:, as_of: today).call
  end

  def employee(amount:, currency: "INR", period: "annual", **attributes)
    create(:employee, hire_date: Date.new(2020, 1, 1), country_code: "IN", **attributes).tap do |created|
      create(:salary_record, employee: created, amount:, currency:, period:, effective_date: Date.new(2020, 1, 1))
    end
  end

  def row_for(rows, key, currency)
    rows.find { _1.group_key == key && _1.currency == currency }
  end

  describe "per country" do
    before do
      employee(amount: 100)
      employee(amount: 200)
      employee(amount: 25, period: "monthly") # 300 a year
      employee(amount: 1_000, currency: "USD", country_code: "US")
    end

    it "computes headcount, min, max, average, median and total annual payroll" do
      india = row_for(statistics, "IN", "INR")

      expect(india).to have_attributes(
        group_label: "India", headcount: 3, min: 100, max: 300, average: 200, median: 200, total: 600
      )
    end

    it "uses each employee's current salary only, not past or scheduled ones" do
      raised = employee(amount: 400)
      create(:salary_record, employee: raised, amount: 500, effective_date: Date.new(2025, 4, 1))
      create(:salary_record, employee: raised, amount: 9_999, effective_date: Date.new(2025, 7, 1))

      expect(row_for(statistics, "IN", "INR")).to have_attributes(headcount: 4, max: 500, total: 1_100)
    end

    it "never mixes currencies: a country's employees paid in another currency get their own row" do
      employee(amount: 50_000, currency: "USD")

      rows = statistics

      expect(row_for(rows, "IN", "INR").total).to eq(600)
      expect(row_for(rows, "IN", "USD")).to have_attributes(headcount: 1, total: 50_000)
    end

    it "leaves out employees with no salary in effect yet" do
      create(:employee, country_code: "IN")

      expect(row_for(statistics, "IN", "INR").headcount).to eq(3)
    end

    it "lists the largest groups first" do
      expect(statistics.map { [ _1.group_key, _1.currency ] }).to eq([ %w[IN INR], %w[US USD] ])
    end
  end

  it "takes the middle of the two central values as the median of an even-sized group" do
    employee(amount: 100)
    employee(amount: 200)

    expect(row_for(statistics, "IN", "INR").median).to eq(150)
  end

  it "keeps averages exact to the cent" do
    employee(amount: 100)
    employee(amount: 100)
    employee(amount: 101)

    expect(row_for(statistics, "IN", "INR").average).to eq(BigDecimal("100.33"))
  end

  describe "grouping and filtering" do
    before do
      employee(amount: 100, department: "Engineering", job_title: "Software Engineer")
      employee(amount: 300, department: "Engineering", job_title: "Engineering Manager")
      employee(amount: 50, department: "Sales", job_title: "Account Executive")
      employee(amount: 900, department: "Engineering", job_title: "Software Engineer", country_code: "US", currency: "USD")
    end

    it "groups by department" do
      engineering = row_for(statistics(group_by: "department"), "Engineering", "INR")

      expect(engineering).to have_attributes(group_label: "Engineering", headcount: 2, total: 400)
    end

    it "answers 'what do we pay for this job title in this country?'" do
      rows = statistics(group_by: "job_title", country: "IN")

      expect(rows.map { [ _1.group_key, _1.currency, _1.median ] }).to contain_exactly(
        [ "Software Engineer", "INR", 100 ], [ "Engineering Manager", "INR", 300 ], [ "Account Executive", "INR", 50 ]
      )
    end
  end

  it "refuses an unknown grouping instead of building SQL from it" do
    expect { described_class.new(group_by: "password_digest", filters: {}) }
      .to raise_error(described_class::UnknownGrouping, "group_by must be one of: country, department, job_title")
  end

  it "returns no rows when nobody matches" do
    expect(statistics(country: "FR")).to eq([])
  end
end
