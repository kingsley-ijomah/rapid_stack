# frozen_string_literal: true

module Mutations
  module UserMutations
    # User Otp-request mutation
    class OtpRequest < Mutations::BaseMutation
      # Define the input arguments for the mutation
      argument :email, String, required: true

      return_type Types::UserType

      def resolve(email:)
        super
        AuthService.new.otp_request(email)
      end
    end
  end
end
