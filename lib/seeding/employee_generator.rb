module Seeding
  # Builds realistic, reproducible employee and salary-history data in memory.
  # Pure Ruby (no database): the same seed and `today` always give the same rows,
  # which keeps demos, screenshots and tests stable.
  #
  # Each row is { employee: {...}, salary_records: [{...}, ...] } with attributes
  # already in their normalized form, because bulk inserts skip model callbacks.
  class EmployeeGenerator
    # Typical annual salary for a mid-level Software Engineer, in local currency.
    # Every other job title is a multiple of this (see JOB_TITLES).
    COUNTRIES = {
      "IN" => { weight: 35, base_salary: 1_800_000, faker_locale: "en-IND" },
      "US" => { weight: 25, base_salary: 130_000, faker_locale: "en-US" },
      "GB" => { weight: 10, base_salary: 65_000, faker_locale: "en-GB" },
      "DE" => { weight: 8, base_salary: 68_000, faker_locale: "de" },
      "CA" => { weight: 7, base_salary: 100_000, faker_locale: "en-CA" },
      "FR" => { weight: 5, base_salary: 55_000, faker_locale: "fr" },
      "AU" => { weight: 5, base_salary: 120_000, faker_locale: "en-AU" },
      "SG" => { weight: 5, base_salary: 95_000, faker_locale: "en" }
    }.freeze

    # department => { job title => salary multiple of the country base }
    JOB_TITLES = {
      "Engineering" => {
        "Junior Software Engineer" => 0.6, "Software Engineer" => 1.0, "Senior Software Engineer" => 1.4,
        "Staff Engineer" => 1.8, "Engineering Manager" => 1.9
      },
      "Product" => { "Product Manager" => 1.2, "Senior Product Manager" => 1.6 },
      "Design" => { "Product Designer" => 0.9, "Senior Product Designer" => 1.2 },
      "Sales" => { "Account Executive" => 0.9, "Sales Manager" => 1.3 },
      "Marketing" => { "Marketing Specialist" => 0.75, "Marketing Manager" => 1.15 },
      "People" => { "HR Generalist" => 0.7, "HR Manager" => 1.1 },
      "Finance" => { "Financial Analyst" => 0.85, "Finance Manager" => 1.3 }
    }.freeze

    EARLIEST_HIRE_DATE = Date.new(2015, 1, 1)
    MONTHLY_PAY_SHARE = 0.2      # share of employees whose salary is agreed per month
    SCHEDULED_RAISE_SHARE = 0.05 # share with a raise already agreed for the coming months
    EMAIL_DOMAIN = "incubyte.example"

    def initialize(seed:, today: Date.current)
      @seed = seed
      @today = today
    end

    def generate(count)
      @random = Random.new(@seed)
      with_seeded_faker { Array.new(count) { |index| build_row(index) } }
    end

    private

    def build_row(index)
      country_code = weighted_country
      department, titles = JOB_TITLES.to_a.sample(random: @random)
      job_title, multiple = titles.to_a.sample(random: @random)
      hire_date = random_date(EARLIEST_HIRE_DATE, @today - 30)
      first_name, last_name = fake_name(country_code)

      {
        employee: {
          full_name: "#{first_name} #{last_name}",
          email: email_for(first_name, last_name, index),
          job_title:, department:, country_code:, hire_date:
        },
        salary_records: salary_history(country_code, multiple, hire_date)
      }
    end

    # Starting salary on the hire date, a raise every April after that, and for
    # some employees one more raise scheduled after `today`.
    def salary_history(country_code, multiple, hire_date)
      currency = Country.find(country_code).currency
      period = @random.rand < MONTHLY_PAY_SHARE ? "monthly" : "annual"
      annual = COUNTRIES.fetch(country_code)[:base_salary] * multiple * @random.rand(0.85..1.15)

      dates = [ hire_date ] + raise_dates(hire_date)
      dates << @today + @random.rand(1..90) if @random.rand < SCHEDULED_RAISE_SHARE

      dates.each_with_index.map do |date, position|
        annual *= 1 + @random.rand(0.03..0.12) unless position.zero?
        { amount: amount_for(annual, period), currency:, period:, effective_date: date }
      end
    end

    def raise_dates(hire_date)
      (hire_date.year + 1..@today.year)
        .map { |year| Date.new(year, 4, 1) }
        .select { |date| date > hire_date && date <= @today }
        .last(@random.rand(0..3))
    end

    def amount_for(annual, period)
      amount = period == "monthly" ? annual / 12 : annual
      amount.round(-2).to_i # salaries are agreed in round numbers
    end

    def weighted_country
      pick = @random.rand(COUNTRIES.sum { |_, config| config[:weight] })
      COUNTRIES.each do |code, config|
        return code if pick < config[:weight]

        pick -= config[:weight]
      end
    end

    def random_date(from, to)
      from + @random.rand((to - from).to_i + 1)
    end

    def fake_name(country_code)
      Faker::Base.with_locale(COUNTRIES.fetch(country_code)[:faker_locale]) do
        [ Faker::Name.first_name, Faker::Name.last_name ]
      end
    end

    # The index guarantees uniqueness; transliteration keeps "Rémy" as "remy".
    def email_for(first_name, last_name, index)
      local_part = [ first_name, last_name ].map { |part| part.parameterize(separator: "") }.join(".")
      "#{local_part}.#{index + 1}@#{EMAIL_DOMAIN}"
    end

    def with_seeded_faker
      previous = Faker::Config.random
      Faker::Config.random = Random.new(@seed)
      yield
    ensure
      Faker::Config.random = previous
    end
  end
end
