module Seeding
  # Writes generated rows with bulk INSERTs: two statements per batch instead of
  # one INSERT per record, so 10,000 employees load in seconds rather than minutes.
  class Loader
    def initialize(batch_size: 1_000)
      @batch_size = batch_size
    end

    def load(rows)
      rows.each_slice(@batch_size) do |batch|
        Employee.transaction do
          # Match ids by the unique email: SQL doesn't promise RETURNING keeps input order.
          ids_by_email = Employee.insert_all!(batch.map { _1[:employee] }, returning: %i[email id]).rows.to_h
          salary_records = batch.flat_map do |row|
            employee_id = ids_by_email.fetch(row[:employee][:email])
            row[:salary_records].map { _1.merge(employee_id:) }
          end
          SalaryRecord.insert_all!(salary_records)
        end
      end
    end
  end
end
