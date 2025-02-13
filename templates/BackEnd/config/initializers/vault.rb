require 'vault'

# Configure Vault client
Vault.configure do |config|
  config.address = ENV['VAULT_ADDR'] || 'http://vault:8200'
  config.token = ENV['VAULT_TOKEN']
  config.ssl_verify = false
end

# Helper module to fetch credentials
module VaultHelper
  def self.get_secret(path, default = nil)
    begin
      secret = Vault.logical.read('secret/data/config')
      return default unless secret&.data&.dig(:data)
      secret.data[:data][path.to_sym] || default
    rescue Vault::VaultError => e
      # Use puts for initialization errors since logger may not be available yet
      puts "Failed to read from Vault: #{e.message}"
      default
    end
  end

  def self.app_credentials
    {
      'name' => get_secret('app/name', Rails.application.credentials.app&.name),
      'domain' => get_secret('app/domain', Rails.application.credentials.app&.domain),
      'support_email' => get_secret('app/support_email', Rails.application.credentials.app&.support_email)
    }
  end

  def self.mailer_credentials
    {
      'from_address' => get_secret('mailer/from_address', Rails.application.credentials.mailer&.from_address),
      'from_name' => get_secret('mailer/from_name', Rails.application.credentials.mailer&.from_name),
      'support_address' => get_secret('mailer/support_address', Rails.application.credentials.mailer&.support_address)
    }
  end

  def self.smtp_credentials
    {
      'address' => get_secret('smtp/address', Rails.application.credentials.smtp&.address),
      'port' => get_secret('smtp/port', Rails.application.credentials.smtp&.port),
      'user_name' => get_secret('smtp/user_name', Rails.application.credentials.smtp&.user_name),
      'password' => get_secret('smtp/password', Rails.application.credentials.smtp&.password)
    }
  end

  def self.mongodb_credentials
    {
      'host' => get_secret('mongodb/host', Rails.application.credentials.mongodb&.host),
      'database' => get_secret('mongodb/database', Rails.application.credentials.mongodb&.database),
      'user' => get_secret('mongodb/user', Rails.application.credentials.mongodb&.user),
      'password' => get_secret('mongodb/password', Rails.application.credentials.mongodb&.password)
    }
  end

  def self.jwt_secret_key
    get_secret('jwt_secret_key', Rails.application.credentials.jwt_secret_key)
  end

  def self.secret_key_base
    get_secret('secret_key_base', Rails.application.credentials.secret_key_base)
  end

  def self.rails_master_key
    get_secret('rails/master_key', ENV['RAILS_MASTER_KEY'])
  end

  def self.postmark_api_token
    get_secret('postmark/api_token', Rails.application.credentials.postmark&.api_token)
  end
end

# Make VaultHelper available globally
Object.const_set(:VaultHelper, VaultHelper) unless defined?(VaultHelper)

# Set Rails master key from Vault if available
if defined?(Rails) && (rails_key = VaultHelper.rails_master_key)
  ENV['RAILS_MASTER_KEY'] = rails_key
end
