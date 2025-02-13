# frozen_string_literal: true

module Mutations
  module UserMutations
    # User password reset mutation if user forgot password
    class PasswordReset < Mutations::BaseMutation
      # Define the input arguments for the mutation
      argument :otp_code, String, required: true
      argument :new_password, String, required: true
      argument :confirm_new_password, String, required: true

      return_type Types::UserType

      def resolve(otp_code:, new_password:, confirm_new_password:)
        super
        AuthService.new.password_reset(otp_code, new_password, confirm_new_password)
      end
    end
  end
end
