require "rails_helper"

RSpec.describe SalaryRecord do
  let(:employee) { create(:employee, hire_date: Date.new(2022, 1, 1)) }

  it "is valid with all required attributes" do
    expect(build(:salary_record, employee:)).to be_valid
  end

  %i[amount currency period effective_date].each do |attribute|
    it "requires #{attribute}" do
      record = build(:salary_record, employee:, attribute => nil)

      expect(record).not_to be_valid
      expect(record.errors[attribute]).to include("can't be blank")
    end
  end

  describe "amount" do
    it "must be positive" do
      record = build(:salary_record, employee:, amount: 0)

      expect(record).not_to be_valid
      expect(record.errors[:amount]).to include("must be greater than 0")
    end

    it "is stored exactly, without floating-point rounding" do
      record = create(:salary_record, employee:, amount: "1234567.89")

      expect(record.reload.amount).to eq(BigDecimal("1234567.89"))
    end
  end

  describe "currency" do
    it "must be a supported ISO 4217 code" do
      record = build(:salary_record, employee:, currency: "XYZ")

      expect(record).not_to be_valid
      expect(record.errors[:currency]).to include("is not a supported currency")
    end

    it "is normalized to upper case" do
      expect(build(:salary_record, employee:, currency: "usd").currency).to eq("USD")
    end
  end

  describe "period" do
    it "rejects anything other than annual or monthly" do
      record = build(:salary_record, employee:, period: "hourly")

      expect(record).not_to be_valid
      expect(record.errors[:period]).to include("is not included in the list")
    end
  end

  describe "effective_date" do
    it "cannot be before the employee was hired" do
      record = build(:salary_record, employee:, effective_date: Date.new(2021, 12, 31))

      expect(record).not_to be_valid
      expect(record.errors[:effective_date]).to include("can't be before the hire date (2022-01-01)")
    end
  end

  describe "#annual_amount" do
    it "is the amount itself for an annual salary" do
      expect(build(:salary_record, amount: 1_200_000, period: "annual").annual_amount).to eq(1_200_000)
    end

    it "is twelve times the amount for a monthly salary" do
      expect(build(:salary_record, amount: 100_000, period: "monthly").annual_amount).to eq(1_200_000)
    end
  end

  describe "append-only history" do
    it "cannot be changed once saved; a correction is a new record" do
      record = create(:salary_record, employee:)

      expect { record.update!(amount: 1) }.to raise_error(ActiveRecord::ReadOnlyRecord)
    end

    it "cannot be deleted on its own" do
      record = create(:salary_record, employee:)

      expect { record.destroy }.to raise_error(ActiveRecord::ReadOnlyRecord)
    end

    it "is removed together with its employee" do
      create(:salary_record, employee:)

      expect { employee.destroy }.to change(described_class, :count).by(-1)
    end
  end

  describe ".current_as_of" do
    let(:today) { Date.new(2025, 6, 15) }

    def salary(on:, amount:, for_employee: employee)
      create(:salary_record, employee: for_employee, effective_date: on, amount:)
    end

    it "picks the latest record that has taken effect by the given date" do
      salary(on: Date.new(2022, 1, 1), amount: 100)
      raise_2024 = salary(on: Date.new(2024, 4, 1), amount: 200)

      expect(described_class.current_as_of(today)).to contain_exactly(raise_2024)
    end

    it "ignores records that take effect after the given date (scheduled raises)" do
      current = salary(on: Date.new(2024, 4, 1), amount: 200)
      salary(on: Date.new(2025, 7, 1), amount: 300)

      expect(described_class.current_as_of(today)).to contain_exactly(current)
    end

    it "counts a record that takes effect exactly on the given date" do
      salary(on: Date.new(2024, 4, 1), amount: 200)
      effective_today = salary(on: today, amount: 300)

      expect(described_class.current_as_of(today)).to contain_exactly(effective_today)
    end

    it "breaks a same-date tie in favour of the most recently created record" do
      salary(on: Date.new(2024, 4, 1), amount: 200)
      correction = salary(on: Date.new(2024, 4, 1), amount: 250)

      expect(described_class.current_as_of(today)).to contain_exactly(correction)
    end

    it "returns one current record per employee" do
      other = create(:employee, hire_date: Date.new(2022, 1, 1))
      mine = salary(on: Date.new(2024, 1, 1), amount: 200)
      theirs = salary(on: Date.new(2023, 1, 1), amount: 500, for_employee: other)

      expect(described_class.current_as_of(today)).to contain_exactly(mine, theirs)
    end

    it "returns nothing for an employee whose first salary has not started yet" do
      salary(on: Date.new(2025, 7, 1), amount: 300)

      expect(described_class.current_as_of(today)).to be_empty
    end
  end
end
