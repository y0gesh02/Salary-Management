# One entry in an employee's pay history: "from effective_date, this person is paid
# amount (in currency) per period". Records are append-only; a raise or a correction
# is a new record, so the history of how someone was paid is never lost.
class SalaryRecord < ApplicationRecord
  PERIODS = %w[annual monthly].freeze
  MONTHS_PER_YEAR = 12
  # SQL twin of #annual_amount, for sorting and aggregating in the database.
  # Keep the two in step; a spec checks they agree.
  ANNUAL_AMOUNT_SQL = "CASE salary_records.period WHEN 'monthly' " \
                      "THEN salary_records.amount * #{MONTHS_PER_YEAR} ELSE salary_records.amount END".freeze

  belongs_to :employee

  normalizes :currency, with: ->(value) { value.strip.upcase }

  validates :amount, :currency, :period, :effective_date, presence: true
  validates :amount, numericality: { greater_than: 0 }, allow_blank: true
  validates :currency, inclusion: { in: Country.currencies, message: "is not a supported currency" }, allow_blank: true
  validates :period, inclusion: { in: PERIODS }, allow_blank: true
  validate :not_effective_before_hire_date

  # The record in effect for each employee on the given date: the latest effective_date
  # on or before it, with the most recently created record winning a same-day tie.
  # `as_of` is always passed in (never CURRENT_DATE) so callers and tests control "today".
  scope :current_as_of, ->(as_of) {
    select("DISTINCT ON (salary_records.employee_id) salary_records.*")
      .where(effective_date: ..as_of)
      .reorder("salary_records.employee_id", effective_date: :desc, id: :desc)
  }

  # Current records plus an `annual_amount` column, to join against for sorting and statistics.
  def self.current_with_annual_amount_as_of(as_of)
    current_as_of(as_of).select("#{ANNUAL_AMOUNT_SQL} AS annual_amount")
  end

  def annual_amount
    monthly? ? amount * MONTHS_PER_YEAR : amount
  end

  def monthly?
    period == "monthly"
  end

  def readonly?
    persisted? || super
  end

  private

  def not_effective_before_hire_date
    hire_date = employee&.hire_date
    return if effective_date.blank? || hire_date.blank? || effective_date >= hire_date

    errors.add(:effective_date, "can't be before the hire date (#{hire_date.iso8601})")
  end
end
