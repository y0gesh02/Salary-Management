module EmployeeSerializer
  # A directory row: profile and the salary in effect today.
  def self.summary(employee, current_salary:)
    {
      id: employee.id,
      full_name: employee.full_name,
      email: employee.email,
      job_title: employee.job_title,
      department: employee.department,
      country: { code: employee.country_code, name: employee.country&.name },
      hire_date: employee.hire_date.iso8601,
      current_salary: current_salary && SalaryRecordSerializer.call(current_salary)
    }
  end

  # The employee page: everything in the summary plus the full pay history,
  # newest first, each record labelled past / current / scheduled.
  def self.detail(employee, as_of: Date.current)
    current_salary = employee.current_salary(as_of:)
    history = employee.salary_records.order(effective_date: :desc, id: :desc).map do |record|
      SalaryRecordSerializer.call(record, status: history_status(record, current_salary, as_of))
    end

    summary(employee, current_salary:).merge(salary_history: history)
  end

  def self.history_status(record, current_salary, as_of)
    return "current" if record == current_salary

    record.effective_date > as_of ? "scheduled" : "past"
  end
  private_class_method :history_status
end
