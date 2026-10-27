class CreateSalaryRecords < ActiveRecord::Migration[8.1]
  def change
    create_table :salary_records do |t|
      # Deleting an employee removes their history in the same statement.
      t.references :employee, null: false, index: false, foreign_key: { on_delete: :cascade }
      t.decimal :amount, precision: 14, scale: 2, null: false
      t.string :currency, limit: 3, null: false
      t.string :period, null: false
      t.date :effective_date, null: false

      # Append-only: records are never updated, so there is no updated_at.
      t.datetime :created_at, null: false
    end

    # Serves "current salary per employee": DISTINCT ON (employee_id) ORDER BY effective_date DESC, id DESC.
    add_index :salary_records, [ :employee_id, :effective_date, :id ],
              order: { effective_date: :desc, id: :desc },
              name: "index_salary_records_on_employee_current"

    add_check_constraint :salary_records, "amount > 0", name: "salary_records_amount_positive"
    add_check_constraint :salary_records, "currency ~ '^[A-Z]{3}$'", name: "salary_records_currency_format"
    add_check_constraint :salary_records, "period IN ('annual', 'monthly')", name: "salary_records_period_valid"
  end
end
