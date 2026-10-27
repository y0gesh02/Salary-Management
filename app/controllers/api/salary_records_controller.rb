module Api
  # A raise, a correction or a scheduled change is always a new salary record;
  # existing records are never edited, so the pay history stays complete.
  class SalaryRecordsController < BaseController
    def create
      employee = Employee.find(params[:employee_id])
      record = employee.salary_records.build(params.expect(salary_record: %i[amount currency period effective_date]))

      if record.save
        render json: EmployeeSerializer.detail(employee), status: :created
      else
        render_validation_errors(record.errors)
      end
    end
  end
end
