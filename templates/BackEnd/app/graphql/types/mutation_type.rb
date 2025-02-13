# frozen_string_literal: true

module Types
  class MutationType < Types::BaseObject # rubocop:disable Style/Documentation
    # User-related mutations
    field :signUp, mutation: Mutations::UserMutations::SignUp
    field :updateUser, mutation: Mutations::UserMutations::UpdateUser
    field :signIn, mutation: Mutations::UserMutations::SignIn
    field :otpRequest, mutation: Mutations::UserMutations::OtpRequest
    field :logout, mutation: Mutations::UserMutations::Logout
    field :updatePassword, mutation: Mutations::UserMutations::UpdatePassword
    field :passwordReset, mutation: Mutations::UserMutations::PasswordReset
  end
end
