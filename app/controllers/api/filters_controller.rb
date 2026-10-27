module Api
  # Options for the directory filters and the employee/salary forms.
  class FiltersController < BaseController
    def show
      render json: {
        countries: Country.all.map(&:to_h),
        departments: Employee.distinct.order(:department).pluck(:department),
        job_titles: Employee.distinct.order(:job_title).pluck(:job_title),
        currencies: Country.currencies.sort,
        periods: SalaryRecord::PERIODS
      }
    end
  end
end
