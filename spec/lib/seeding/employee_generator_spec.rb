require "rails_helper"

RSpec.describe Seeding::EmployeeGenerator do
  let(:today) { Date.new(2026, 10, 27) }

  def generate(count: 200, seed: 42)
    described_class.new(seed:, today:).generate(count)
  end

  it "generates the requested number of employees" do
    expect(generate(count: 25).size).to eq(25)
  end

  it "is deterministic: the same seed always produces the same data" do
    expect(generate(seed: 7)).to eq(generate(seed: 7))
  end

  it "produces different data for a different seed" do
    expect(generate(seed: 1)).not_to eq(generate(seed: 2))
  end

  it "gives every employee a unique email" do
    emails = generate(count: 1_000).map { |row| row[:employee][:email] }

    expect(emails.uniq.size).to eq(1_000)
  end

  # insert_all skips validations and normalization, so the generator itself
  # must only emit data the domain model would accept.
  it "only produces employees and salary records that pass model validation" do
    generate.each do |row|
      employee = Employee.new(row[:employee])
      expect(employee).to be_valid, -> { employee.errors.full_messages.inspect }

      row[:salary_records].each do |attributes|
        record = employee.salary_records.build(attributes)
        expect(record).to be_valid, -> { record.errors.full_messages.inspect }
      end
    end
  end

  it "starts each salary history on the hire date" do
    generate.each do |row|
      expect(row[:salary_records].first[:effective_date]).to eq(row[:employee][:hire_date])
    end
  end

  it "uses the employee's country currency" do
    generate.each do |row|
      currency = Country.find(row[:employee][:country_code]).currency

      expect(row[:salary_records].map { _1[:currency] }).to all(eq(currency))
    end
  end

  it "covers the cases the app must handle: several countries, raises, monthly pay and scheduled raises" do
    rows = generate(count: 1_000)
    records = rows.flat_map { _1[:salary_records] }

    expect(rows.map { _1[:employee][:country_code] }.uniq.size).to eq(Country.codes.size)
    expect(rows.count { _1[:salary_records].size > 1 }).to be > 100
    expect(records.count { _1[:period] == "monthly" }).to be > 50
    expect(records.count { _1[:effective_date] > today }).to be > 10
  end

  it "never hires anyone in the future" do
    expect(generate.map { _1[:employee][:hire_date] }).to all(be <= today)
  end
end
