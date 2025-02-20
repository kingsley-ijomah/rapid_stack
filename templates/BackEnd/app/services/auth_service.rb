# app/services/auth_service.rb

# This service class will contain all the
# logic for handling user authentication
class AuthService
  include ServiceResponse
  include SharedGraphqlMethods

  begin
    @jwt_secret = ConfigHelper.jwt_secret_key
  rescue => e
    Rails.logger.warn "Failed to load JWT secret from Vault: #{e.message}. Using Rails credentials."
    @jwt_secret = Rails.application.credentials.jwt_secret_key
  end

  def logout(user, jwt_payload)
    # check user and jwt_payload are present
    return failure_response(errors: ['User not found']) unless user
    return failure_response(errors: ['JWT payload not found']) unless jwt_payload

    denied = JwtDenylist.find_by(jti: jwt_payload['jti'])
    return failure_response(errors: ['You are already logged out']) if denied

    JwtDenylist.create(jti: jwt_payload['jti'])
    success_response(data: user)
  end

  def otp_request(email)
    user = User.find_by(email:)
    return failure_response(errors: ['User not found']) unless user

    otp_code = rand.to_s[2..6]
    Otp.create(user:, otp_code:, expires_at: Time.now + 30.minutes)
    UserMailer.otp_email(user, otp_code).deliver_now

    success_response(data: user)
  end

  def password_reset(otp_code, new_password, confirm_new_password)
    otp = Otp.find_by(otp_code:)
    return failure_response(errors: ['OTP code not found']) unless otp
    return failure_response(errors: ['Invalid or expired OTP code']) if otp.expires_at < Time.current
    return failure_response(errors: ['Passwords do not match']) if new_password != confirm_new_password

    user = User.find(otp.user_id)

    if user.update(password: new_password)
      otp.destroy
      success_response(data: user)
    else
      failure_response(errors: user.errors.full_messages)
    end
  end

  def sign_in(email, password)
    user = User.find_by(email:)
    return failure_response(errors: ['User not found']) unless user
    return failure_response(errors: ['Invalid email or password']) unless user&.valid_password?(password)

    payload = {
      sub: user.id.to_s,
      jti: SecureRandom.uuid,
      exp: 24.hours.from_now.to_i
    }
    token = JWT.encode(payload, self.class.jwt_secret, 'HS256')
    res = success_response(data: user)
    res[:token] = token
    res
  end

  def sign_up(full_name, email, password, password_confirmation, telephone, accept_terms)
    user = User.new(full_name:, email:, password:, password_confirmation:, telephone:, accept_terms:)
    return failure_response(errors: user.errors.full_messages) unless user.save

    success_response(data: user)
  end

  def password_update(user, password, new_password, confirm_new_password)
    return failure_response(errors: ['Passwords do not match']) if new_password != confirm_new_password
    return failure_response(errors: ['Invalid password']) unless user&.valid_password?(password)

    if user.update(password: new_password)
      success_response(data: user)
    else
      failure_response(errors: user.errors.full_messages)
    end
  end

  def update_user(user, params)
    user = User.find_by(id: user.id)
    return failure_response(errors: ['User not found']) unless user

    if user.update(params)
      success_response(data: user)
    else
      failure_response(errors: user.errors.full_messages)
    end
  end

  private

  def self.jwt_secret
    @jwt_secret
  end
end
