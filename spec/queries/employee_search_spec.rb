require "rails_helper"

RSpec.describe EmployeeSearch do
  let(:today) { Date.new(2025, 6, 15) }

  def search(**params)
    described_class.new(params, as_of: today).call
  end

  def employee(name, salary: nil, period: "annual", **attributes)
    create(:employee, full_name: name, hire_date: Date.new(2020, 1, 1), **attributes).tap do |created|
      create(:salary_record, employee: created, amount: salary, period:, effective_date: Date.new(2020, 1, 1)) if salary
    end
  end

  describe "current salary" do
    it "returns each employee's salary in effect on the given date" do
      priya = employee("Priya", salary: 100)
      create(:salary_record, employee: priya, amount: 200, effective_date: Date.new(2025, 4, 1))
      create(:salary_record, employee: priya, amount: 300, effective_date: Date.new(2025, 7, 1))

      result = search

      expect(result.current_salary_for(priya).amount).to eq(200)
    end

    it "is nil for an employee whose salary has not started yet" do
      newcomer = employee("Newcomer")

      expect(search.current_salary_for(newcomer)).to be_nil
    end
  end

  describe "text search" do
    it "matches part of the name or email, ignoring case" do
      priya = employee("Priya Sharma", email: "priya@incubyte.test")
      john = employee("John Smith", email: "jsmith@incubyte.test")
      employee("Anna Berg", email: "anna@incubyte.test")

      expect(search(q: "SHAR").employees).to contain_exactly(priya)
      expect(search(q: "jsmith@").employees).to contain_exactly(john)
    end

    it "treats SQL wildcards in the search text literally" do
      employee("Priya Sharma")

      expect(search(q: "%").employees).to be_empty
    end
  end

  describe "filters" do
    it "narrows by country, department and job title together" do
      match = employee("Match", country_code: "IN", department: "Sales", job_title: "Account Executive")
      employee("Wrong country", country_code: "US", department: "Sales", job_title: "Account Executive")
      employee("Wrong department", country_code: "IN", department: "Finance", job_title: "Account Executive")

      result = search(country: "IN", department: "Sales", job_title: "Account Executive")

      expect(result.employees).to contain_exactly(match)
    end
  end

  describe "sorting" do
    it "sorts by name by default" do
      employee("Charlie")
      employee("alice")
      employee("Bob")

      expect(search.employees.map(&:full_name)).to eq(%w[alice Bob Charlie])
    end

    it "sorts descending with a leading minus" do
      employee("Old", hire_date: Date.new(2016, 1, 1))
      employee("New", hire_date: Date.new(2024, 1, 1))

      expect(search(sort: "-hire_date").employees.map(&:full_name)).to eq(%w[New Old])
    end

    it "sorts by annual salary, so monthly pay is compared fairly" do
      employee("Annual 1.3M", salary: 1_300_000)
      employee("Monthly 120k (1.44M a year)", salary: 120_000, period: "monthly")
      employee("Annual 1.4M", salary: 1_400_000)

      expect(search(sort: "-annual_salary").employees.map(&:full_name))
        .to eq([ "Monthly 120k (1.44M a year)", "Annual 1.4M", "Annual 1.3M" ])
    end

    it "puts employees without a current salary last" do
      employee("No salary")
      employee("Paid", salary: 100)

      expect(search(sort: "-annual_salary").employees.map(&:full_name)).to eq([ "Paid", "No salary" ])
    end

    it "falls back to the default order for an unknown sort key" do
      employee("Bob")
      employee("Alice")

      expect(search(sort: "password_digest; DROP TABLE").employees.map(&:full_name)).to eq(%w[Alice Bob])
    end
  end

  describe "pagination" do
    before { %w[A B C D E].each { employee(_1) } }

    it "returns the requested page and the total across all pages" do
      result = search(page: 2, per_page: 2)

      expect(result.employees.map(&:full_name)).to eq(%w[C D])
      expect(result).to have_attributes(total: 5, page: 2, per_page: 2)
    end

    it "keeps page and page size within sensible bounds" do
      expect(search(page: 0, per_page: 1_000)).to have_attributes(page: 1, per_page: EmployeeSearch::MAX_PER_PAGE)
      expect(search(page: "abc", per_page: "-5")).to have_attributes(page: 1, per_page: EmployeeSearch::DEFAULT_PER_PAGE)
    end
  end

  it "loads a page with a fixed number of queries, however many employees it shows" do
    5.times { |i| employee("Employee #{i}", salary: 100) }

    queries = count_queries do
      result = search
      result.employees.each { result.current_salary_for(_1) }
    end

    expect(queries).to eq(3) # total count, the page, current salaries for the page
  end

  def count_queries(&block)
    count = 0
    counter = ->(*, payload) { count += 1 unless payload[:name] == "SCHEMA" }
    ActiveSupport::Notifications.subscribed(counter, "sql.active_record", &block)
    count
  end
end
