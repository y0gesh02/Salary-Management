class Employee < ApplicationRecord
  # Rows are removed by the database (ON DELETE CASCADE); salary records are read-only in Ruby.
  has_many :salary_records

  normalizes :full_name, :job_title, :department, with: ->(value) { value.strip }
  normalizes :email, with: ->(value) { value.strip.downcase }
  normalizes :country_code, with: ->(value) { value.strip.upcase }

  validates :full_name, :email, :job_title, :department, :country_code, :hire_date, presence: true
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }, uniqueness: true, allow_blank: true
  validates :country_code, inclusion: { in: Country.codes, message: "is not a supported country" }, allow_blank: true
  validate :hire_date_not_after_first_salary, if: -> { persisted? && will_save_change_to_hire_date? }

  # The filters shared by the directory and the salary insights.
  def self.filtered_by(country: nil, department: nil, job_title: nil)
    scope = all
    scope = scope.where(country_code: country.to_s.upcase) if country.present?
    scope = scope.where(department:) if department.present?
    scope = scope.where(job_title:) if job_title.present?
    scope
  end

  def country
    Country.find(country_code)
  end

  def current_salary(as_of: Date.current)
    salary_records.current_as_of(as_of).first
  end

  private

  def hire_date_not_after_first_salary
    first_effective_date = salary_records.minimum(:effective_date)
    return if hire_date.blank? || first_effective_date.nil? || hire_date <= first_effective_date

    errors.add(:hire_date, "can't be after the first salary record (#{first_effective_date.iso8601})")
  end
end
