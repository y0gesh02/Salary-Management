require "rails_helper"

RSpec.describe Country do
  describe ".find" do
    it "returns the country with its name and default currency" do
      india = described_class.find("IN")

      expect(india.name).to eq("India")
      expect(india.currency).to eq("INR")
    end

    it "returns nil for an unsupported country code" do
      expect(described_class.find("XX")).to be_nil
    end
  end

  describe ".codes" do
    it "lists every supported ISO 3166-1 alpha-2 code" do
      expect(described_class.codes).to include("US", "IN", "GB")
      expect(described_class.codes).to all(match(/\A[A-Z]{2}\z/))
    end
  end

  describe ".currencies" do
    it "lists each supported ISO 4217 currency once" do
      expect(described_class.currencies).to include("USD", "INR", "EUR")
      expect(described_class.currencies).to eq(described_class.currencies.uniq)
    end
  end
end
