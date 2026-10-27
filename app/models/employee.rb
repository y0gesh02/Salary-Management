class Employee < ApplicationRecord
  normalizes :full_name, :job_title, :department, with: ->(value) { value.strip }
  normalizes :email, with: ->(value) { value.strip.downcase }
  normalizes :country_code, with: ->(value) { value.strip.upcase }

  validates :full_name, :email, :job_title, :department, :country_code, :hire_date, presence: true
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }, uniqueness: true, allow_blank: true
  validates :country_code, inclusion: { in: Country.codes, message: "is not a supported country" }, allow_blank: true

  def country
    Country.find(country_code)
  end
end
