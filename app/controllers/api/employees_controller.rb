module Api
  class EmployeesController < BaseController
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

    private

    def search_params
      params.permit(:q, :country, :department, :job_title, :sort, :page, :per_page).to_h.symbolize_keys
    end
  end
end
