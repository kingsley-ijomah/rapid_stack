# frozen_string_literal: true

module Mutations
  module UserMutations
    # User sign-in mutation
    class SignIn < Mutations::BaseMutation
      # Define the input arguments for the mutation
      argument :email, String, required: true
      argument :password, String, required: true

      return_type Types::UserType

      def resolve(email:, password:)
        super
        AuthService.new.sign_in(email, password)
      end
    end
  end
end
