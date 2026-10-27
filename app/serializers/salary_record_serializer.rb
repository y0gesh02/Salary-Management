# Money is sent as decimal strings ("1234567.89"), never floats, so no amount is
# rounded on its way to the browser.
module SalaryRecordSerializer
  def self.call(record, status: nil)
    {
      id: record.id,
      amount: record.amount.to_s("F"),
      currency: record.currency,
      period: record.period,
      annual_amount: record.annual_amount.to_s("F"),
      effective_date: record.effective_date.iso8601,
      status:
    }.compact
  end
end
