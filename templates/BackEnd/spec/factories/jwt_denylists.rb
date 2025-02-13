FactoryBot.define do
  factory :jwt_denylist do
    jti { "MyString" }
    exp { "2025-01-22 07:21:58" }
  end
end
