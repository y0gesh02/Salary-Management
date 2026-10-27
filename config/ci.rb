# Run using bin/ci — locally and in GitHub Actions (.github/workflows/ci.yml),
# so "green on my machine" means the same thing as "green in CI".

CI.run do
  step "Setup", "bin/setup --skip-server"

  step "Style: Ruby", "bin/rubocop"

  step "Security: Gem audit", "bin/bundler-audit"
  step "Security: Brakeman code analysis", "bin/brakeman --quiet --no-pager --exit-on-warn --exit-on-error"

  step "Tests: Ruby", "bundle exec rspec"

  step "Frontend: Install", "npm --prefix frontend ci"
  step "Frontend: Lint", "npm --prefix frontend run lint"
  step "Frontend: Type check", "npm --prefix frontend run typecheck"
  step "Frontend: Tests", "npm --prefix frontend test"
  step "Frontend: Build", "npm --prefix frontend run build"
end
