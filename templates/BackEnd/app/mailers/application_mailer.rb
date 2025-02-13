class ApplicationMailer < ActionMailer::Base
  begin
    mailer_creds = VaultHelper.mailer_credentials
  rescue => e
    Rails.logger.warn "Failed to load from Vault: #{e.message}. Using Rails credentials."
    mailer_creds = Rails.application.credentials.mailer
  end

  default from: mailer_creds['from_address'] || mailer_creds[:from_address]
  layout 'mailer'
end
