# app/mailers/user_mailer.rb

class UserMailer < ApplicationMailer
  begin
    mailer_creds = ConfigHelper.mailer_credentials
    app_creds = ConfigHelper.app_credentials
  rescue => e
    Rails.logger.warn "Failed to load from Env: #{e.message}. Using Rails credentials."
    mailer_creds = Rails.application.credentials.mailer
    app_creds = Rails.application.credentials.app
  end

  # Use the mailer configuration from Vault or credentials
  default from: mailer_creds['from_address'] || mailer_creds[:from_address]

  def otp_email(user, otp)
    @user = user
    @otp = otp

    mail(
      to: @user.email,
      subject: "Your OTP for #{app_creds['name'] || app_creds[:name]}",
      track_opens: 'true'
    )
  end
end
