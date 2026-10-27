class CreateEmployees < ActiveRecord::Migration[8.1]
  def change
    create_table :employees do |t|
      t.string :full_name, null: false
      t.string :email, null: false
      t.string :job_title, null: false
      t.string :department, null: false
      t.string :country_code, limit: 2, null: false
      t.date :hire_date, null: false

      t.timestamps
    end

    # The model normalizes email to lower case, so a plain unique index is case-insensitive in practice.
    add_index :employees, :email, unique: true
    add_index :employees, :country_code
    add_index :employees, :department
    add_index :employees, :job_title

    add_check_constraint :employees, "email = lower(email)", name: "employees_email_lowercase"
    add_check_constraint :employees, "country_code ~ '^[A-Z]{2}$'", name: "employees_country_code_format"
  end
end
