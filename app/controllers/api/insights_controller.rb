module Api
  class InsightsController < BaseController
    MONEY_FIELDS = %i[min max average median total].freeze

    def salaries
      as_of = Date.current
      group_by = params.fetch(:group_by, "country")
      rows = SalaryStatistics.new(group_by:, filters: params.permit(:country, :department, :job_title), as_of:).call

      render json: { group_by:, as_of: as_of.iso8601, data: rows.map { serialize(_1) } }
    rescue SalaryStatistics::UnknownGrouping => error
      render json: { error: error.message }, status: :bad_request
    end

    private

    def serialize(row)
      {
        group: { key: row.group_key, label: row.group_label },
        currency: row.currency,
        headcount: row.headcount,
        **MONEY_FIELDS.index_with { row.public_send(_1).to_s("F") }
      }
    end
  end
end
