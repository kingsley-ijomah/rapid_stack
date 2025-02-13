FactoryBot.define do
  factory :otp do
    user { nil }
    otp_code { "MyString" }
    expires_at { "2025-01-22 22:58:14" }
  end
end
