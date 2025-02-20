# Helper module to fetch configuration values from environment variables with credential fallbacks
module ConfigHelper
  def self.get_secret(path, default = nil)
    # Convert path to uppercase and replace special characters for ENV var format
    env_key = path.upcase.gsub(/[^A-Z0-9_]/, '_')
    ENV[env_key] || default
  end

  def self.app_credentials
    {
      'name' => get_secret('app_name', Rails.application.credentials.app&.name),
      'domain' => get_secret('app_domain', Rails.application.credentials.app&.domain),
      'support_email' => get_secret('app_support_email', Rails.application.credentials.app&.support_email)
    }
  end

  def self.mailer_credentials
    {
      'from_address' => get_secret('mailer_from_address', Rails.application.credentials.mailer&.from_address),
      'from_name' => get_secret('mailer_from_name', Rails.application.credentials.mailer&.from_name),
      'support_address' => get_secret('app_support_email', Rails.application.credentials.app&.support_email)
    }
  end

  def self.jwt_secret_key
    ENV['JWT_SECRET_KEY']
  end

  def self.secret_key_base
    ENV['SECRET_KEY_BASE']
  end

  def self.rails_master_key
    ENV['RAILS_MASTER_KEY']
  end

  def self.postmark_api_token
    ENV['POSTMARK_API_TOKEN']
  end
end
