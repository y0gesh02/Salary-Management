module Api
  class EmployeesController < BaseController
    PROFILE_FIELDS = %i[full_name email job_title department country_code hire_date].freeze
    SALARY_FIELDS = %i[amount currency period].freeze

    def index
      result = EmployeeSearch.new(search_params).call

      render json: {
        data: result.employees.map { EmployeeSerializer.summary(_1, current_salary: result.current_salary_for(_1)) },
        meta: { page: result.page, per_page: result.per_page, total: result.total }
      }
    end

    def show
      render json: EmployeeSerializer.detail(Employee.find(params[:id]))
    end

    def create
      result = Employees::Create.call(**create_params)

      if result.success?
        render json: EmployeeSerializer.detail(result.employee), status: :created
      else
        render_validation_errors(result.errors)
      end
    end

    # Profile fields only: salary changes are new salary records (see SalaryRecordsController).
    def update
      employee = Employee.find(params[:id])

      if employee.update(params.expect(employee: PROFILE_FIELDS))
        render json: EmployeeSerializer.detail(employee)
      else
        render_validation_errors(employee.errors)
      end
    end

    def destroy
      Employee.find(params[:id]).destroy!
      head :no_content
    end

    private

    def create_params
      attributes = params.expect(employee: [ *PROFILE_FIELDS, initial_salary: SALARY_FIELDS ]).to_h.symbolize_keys
      attributes[:initial_salary] = attributes[:initial_salary]&.symbolize_keys
      attributes.reverse_merge(initial_salary: nil)
    end

    def search_params
      params.permit(:q, :country, :department, :job_title, :sort, :page, :per_page).to_h.symbolize_keys
    end
  end
end
