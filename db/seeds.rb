# Sets up the HR Manager account and 10,000 employees. Safe to re-run.
#
#   bin/rails db:seed                     # first run
#   RESET=1 bin/rails db:seed             # replace existing employee data
#   SEED_EMPLOYEES=500 bin/rails db:seed  # smaller dataset
#
# Production requires HR_EMAIL and HR_PASSWORD; development falls back to demo credentials.

def setting(name, development_default)
  Rails.env.production? ? ENV.fetch(name) : ENV.fetch(name, development_default)
end

hr_email = setting("HR_EMAIL", "hr@incubyte.test")
hr_user = User.find_or_initialize_by(email: hr_email.strip.downcase)
hr_user.update!(password: setting("HR_PASSWORD", "incubyte-hr-password"))
puts "HR Manager account ready: #{hr_user.email}"

if Employee.exists? && ENV["RESET"].blank?
  puts "Employees already seeded (#{Employee.count}); set RESET=1 to replace them."
  return
end

count = Integer(ENV.fetch("SEED_EMPLOYEES", 10_000))
started_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)

Employee.transaction do
  Employee.delete_all # salary records go with them (ON DELETE CASCADE)
  rows = Seeding::EmployeeGenerator.new(seed: 42).generate(count)
  Seeding::Loader.new.load(rows)
end

elapsed = Process.clock_gettime(Process::CLOCK_MONOTONIC) - started_at
puts format("Seeded %<employees>d employees and %<records>d salary records in %<seconds>.1fs",
            employees: Employee.count, records: SalaryRecord.count, seconds: elapsed)
