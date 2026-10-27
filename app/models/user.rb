# The HR Manager account. There is no sign-up: the account is created by db/seeds.rb.
class User < ApplicationRecord
  MINIMUM_PASSWORD_LENGTH = 12

  has_secure_password

  normalizes :email, with: ->(value) { value.strip.downcase }

  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :password, length: { minimum: MINIMUM_PASSWORD_LENGTH }, allow_nil: true
end
