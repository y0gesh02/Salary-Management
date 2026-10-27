module Employees
  # Hires an employee: the profile and their first salary (effective from the hire
  # date) are saved together or not at all. Errors from both come back in one hash,
  # salary errors prefixed "initial_salary." so a form can place them by field.
  class Create
    Result = Data.define(:employee, :errors) do
      def success? = errors.empty?
    end

    # The salary's effective date is the hire date, so errors on it duplicate the
    # hire_date error; the employee link is internal.
    IGNORED_SALARY_ERRORS = %i[effective_date employee].freeze

    def self.call(initial_salary:, **profile)
      new(profile, initial_salary).call
    end

    def initialize(profile, initial_salary)
      @profile = profile
      @initial_salary = initial_salary
    end

    def call
      employee = Employee.new(@profile)
      salary = @initial_salary && SalaryRecord.new(**@initial_salary, employee:, effective_date: employee.hire_date)

      errors = errors_for(employee, salary)
      return Result.new(employee:, errors:) if errors.any?

      Employee.transaction do
        employee.save!
        salary.save!
      end
      Result.new(employee:, errors: {})
    end

    private

    def errors_for(employee, salary)
      errors = employee.invalid? ? employee.errors.to_hash.transform_keys(&:to_s) : {}
      return errors.merge("initial_salary" => [ "can't be blank" ]) if salary.nil?
      return errors if salary.valid?

      salary.errors.to_hash.except(*IGNORED_SALARY_ERRORS).each_with_object(errors) do |(field, messages), all|
        all["initial_salary.#{field}"] = messages
      end
    end
  end
end
