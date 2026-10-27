module Api
  # Parent of every API controller. Secure by default: login is required unless a
  # controller explicitly opts out, and state-changing requests need a CSRF token
  # because authentication rides on a session cookie.
  class BaseController < ActionController::Base
    protect_from_forgery with: :exception

    before_action :require_login

    rescue_from ActiveRecord::RecordNotFound do
      render json: { error: "Not found" }, status: :not_found
    end

    rescue_from ActionController::ParameterMissing do |error|
      render json: { error: error.message }, status: :bad_request
    end

    rescue_from ActionController::InvalidAuthenticityToken do
      render json: { error: "Invalid or missing CSRF token" }, status: :forbidden
    end

    private

    def current_user
      return @current_user if defined?(@current_user)

      @current_user = User.find_by(id: session[:user_id])
    end

    # One error shape for every form: { errors: { "field" => ["message", ...] } }
    def render_validation_errors(errors)
      render json: { errors: errors.to_hash.transform_keys(&:to_s) }, status: :unprocessable_content
    end

    def require_login
      render json: { error: "Not logged in" }, status: :unauthorized unless current_user
    end
  end
end
