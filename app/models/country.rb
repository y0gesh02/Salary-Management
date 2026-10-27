# Countries ACME employs people in, with each country's default salary currency.
# Reference data rather than a table: it changes rarely and only with a deploy.
# The default currency only pre-fills forms; every salary record stores its own currency.
class Country < Data.define(:code, :name, :currency)
  ALL = [
    new(code: "US", name: "United States", currency: "USD"),
    new(code: "IN", name: "India", currency: "INR"),
    new(code: "GB", name: "United Kingdom", currency: "GBP"),
    new(code: "DE", name: "Germany", currency: "EUR"),
    new(code: "FR", name: "France", currency: "EUR"),
    new(code: "CA", name: "Canada", currency: "CAD"),
    new(code: "AU", name: "Australia", currency: "AUD"),
    new(code: "SG", name: "Singapore", currency: "SGD")
  ].index_by(&:code).freeze

  def self.find(code) = ALL[code]
  def self.all = ALL.values
  def self.codes = ALL.keys
  def self.currencies = all.map(&:currency).uniq
end
