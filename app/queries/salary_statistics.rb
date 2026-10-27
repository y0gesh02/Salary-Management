# Answers "how does the org pay people?": per group, the headcount and the min,
# max, average, median and total of current annual salaries.
#
# Rows are per (group, currency): amounts in different currencies are never
# combined, because there is no honest exchange rate to combine them with.
# Monthly salaries are annualized; employees with no salary in effect yet are
# left out. Everything is one aggregate query.
class SalaryStatistics
  GROUP_COLUMNS = {
    "country" => "employees.country_code",
    "department" => "employees.department",
    "job_title" => "employees.job_title"
  }.freeze

  AGGREGATES = [
    "COUNT(*)",
    "MIN(current_salaries.annual_amount)",
    "MAX(current_salaries.annual_amount)",
    "ROUND(AVG(current_salaries.annual_amount), 2)",
    # percentile_cont works in floating point; cast back so the API only ever sends exact decimals.
    "ROUND(CAST(percentile_cont(0.5) WITHIN GROUP (ORDER BY current_salaries.annual_amount) AS numeric), 2)",
    "SUM(current_salaries.annual_amount)"
  ].map { Arel.sql(_1) }.freeze

  class UnknownGrouping < ArgumentError; end

  Row = Data.define(:group_key, :group_label, :currency, :headcount, :min, :max, :average, :median, :total)

  def initialize(group_by:, filters: {}, as_of: Date.current)
    @group_by = group_by.to_s
    @group_column = GROUP_COLUMNS.fetch(@group_by) do
      raise UnknownGrouping, "group_by must be one of: #{GROUP_COLUMNS.keys.join(", ")}"
    end
    @filters = filters.to_h.symbolize_keys.slice(:country, :department, :job_title)
    @as_of = as_of
  end

  def call
    group = Arel.sql(@group_column) # whitelisted above, never user input
    current = SalaryRecord.current_with_annual_amount_as_of(@as_of)

    Employee.filtered_by(**@filters)
            .joins("INNER JOIN (#{current.to_sql}) current_salaries ON current_salaries.employee_id = employees.id")
            .group(group, "current_salaries.currency")
            .order(Arel.sql("COUNT(*) DESC"), group, "current_salaries.currency")
            .pluck(group, "current_salaries.currency", *AGGREGATES)
            .map { |key, currency, *figures| build_row(key, currency, figures) }
  end

  private

  def build_row(key, currency, figures)
    headcount, min, max, average, median, total = figures
    Row.new(group_key: key, group_label: label_for(key), currency:, headcount:, min:, max:, average:, median:, total:)
  end

  def label_for(key)
    @group_by == "country" ? Country.find(key)&.name || key : key
  end
end
