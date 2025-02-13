module JwtHelper
  def generate_jwt_token(user)
    payload = {
      sub: user.id,
      jti: SecureRandom.uuid,
      exp: 24.hours.from_now.to_i
    }
    JWT.encode(payload, VaultHelper.jwt_secret_key)
  end

  def decode_jwt_token(token)
    JWT.decode(token, VaultHelper.jwt_secret_key).first
  end

  def encode_jwt_token(payload)
    JWT.encode(payload, VaultHelper.jwt_secret_key)
  end
end
