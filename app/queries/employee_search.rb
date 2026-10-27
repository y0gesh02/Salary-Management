# The employee directory query: text search, filters, sorting and pagination,
# all in SQL. A page costs a fixed three queries (total, page rows, the page's
# current salaries) no matter how many employees it shows.
class EmployeeSearch
  DEFAULT_PER_PAGE = 25
  MAX_PER_PAGE = 100
  DEFAULT_SORT = "full_name"
  SORT_COLUMNS = {
    "full_name" => "lower(employees.full_name)",
    "hire_date" => "employees.hire_date",
    "country" => "employees.country_code",
    "department" => "lower(employees.department)",
    "job_title" => "lower(employees.job_title)",
    "annual_salary" => "current_salaries.annual_amount"
  }.freeze

  Result = Data.define(:employees, :total, :page, :per_page, :current_salaries) do
    def current_salary_for(employee) = current_salaries[employee.id]
  end

  def initialize(params = {}, as_of: Date.current)
    @params = params
    @as_of = as_of
  end

  def call
    scope = filtered
    employees = sorted(scope).limit(per_page).offset((page - 1) * per_page).to_a
    current_salaries = SalaryRecord.current_as_of(@as_of).where(employee_id: employees.map(&:id)).index_by(&:employee_id)

    Result.new(employees:, total: scope.count, page:, per_page:, current_salaries:)
  end

  private

  def filtered
    scope = Employee.all
    scope = scope.where(country_code: @params[:country].to_s.upcase) if @params[:country].present?
    scope = scope.where(department: @params[:department]) if @params[:department].present?
    scope = scope.where(job_title: @params[:job_title]) if @params[:job_title].present?
    scope = matching_text(scope) if @params[:q].present?
    scope
  end

  def matching_text(scope)
    pattern = "%#{Employee.sanitize_sql_like(@params[:q].to_s.strip)}%"
    scope.where("employees.full_name ILIKE :pattern OR employees.email ILIKE :pattern", pattern:)
  end

  def sorted(scope)
    key, direction = sort
    scope = scope.joins(current_salaries_join) if key == "annual_salary"
    # NULLS LAST keeps employees without a salary at the end; id makes the order total, so pages never overlap.
    scope.order(Arel.sql("#{SORT_COLUMNS.fetch(key)} #{direction} NULLS LAST, employees.id ASC"))
  end

  def current_salaries_join
    current = SalaryRecord.current_as_of(@as_of).select("#{SalaryRecord::ANNUAL_AMOUNT_SQL} AS annual_amount")
    "LEFT JOIN (#{current.to_sql}) current_salaries ON current_salaries.employee_id = employees.id"
  end

  # "hire_date" sorts ascending, "-hire_date" descending; anything unknown falls back to name.
  def sort
    requested = @params[:sort].to_s
    key = requested.delete_prefix("-")
    return [ DEFAULT_SORT, "ASC" ] unless SORT_COLUMNS.key?(key)

    [ key, requested.start_with?("-") ? "DESC" : "ASC" ]
  end

  def page
    [ Integer(@params[:page], exception: false) || 1, 1 ].max
  end

  def per_page
    requested = Integer(@params[:per_page], exception: false)
    return DEFAULT_PER_PAGE if requested.nil? || requested < 1

    [ requested, MAX_PER_PAGE ].min
  end
end
