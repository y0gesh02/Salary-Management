module Api
  class SessionsController < BaseController
    skip_before_action :require_login

    rate_limit to: 10, within: 3.minutes, only: :create, with: -> {
      render json: { error: "Too many login attempts. Try again in a few minutes." }, status: :too_many_requests
    }

    def show
      render json: session_payload
    end

    def create
      user = User.authenticate_by(email: params[:email].to_s, password: params[:password].to_s)

      if user
        reset_session # new session id on login prevents session fixation
        session[:user_id] = user.id
        render json: session_payload
      else
        render json: { error: "Invalid email or password" }, status: :unauthorized
      end
    end

    def destroy
      reset_session
      head :no_content
    end

    private

    # The CSRF token is returned on every call because reset_session rotates it.
    def session_payload
      {
        user: current_user && { email: current_user.email },
        csrf_token: form_authenticity_token
      }
    end
  end
end
