Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Everything else that is an HTML page request belongs to the React app,
  # which does its own client-side routing. Must stay the last route.
  root "spa#index"
  get "*path", to: "spa#index", constraints: SpaRequest
end
