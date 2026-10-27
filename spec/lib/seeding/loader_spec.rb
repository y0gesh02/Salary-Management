require "rails_helper"

RSpec.describe Seeding::Loader do
  let(:rows) { Seeding::EmployeeGenerator.new(seed: 42, today: Date.new(2026, 10, 27)).generate(30) }

  it "bulk-inserts every employee with their full salary history" do
    described_class.new(batch_size: 7).load(rows)

    expect(Employee.count).to eq(30)
    expect(SalaryRecord.count).to eq(rows.sum { _1[:salary_records].size })
  end

  it "attaches each salary history to the right employee" do
    described_class.new.load(rows)

    row = rows.first
    employee = Employee.find_by!(email: row[:employee][:email])
    expect(employee.salary_records.order(:effective_date, :id).pluck(:amount))
      .to eq(row[:salary_records].map { BigDecimal(_1[:amount].to_s) })
  end
end
