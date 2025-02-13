# frozen_string_literal: true

module Mutations
  module UserMutations
    # User sign-in mutation
    class SignUp < Mutations::BaseMutation
      # Define the input arguments for the mutation
      argument :full_name, String, required: true
      argument :email, String, required: true
      argument :password, String, required: true
      argument :password_confirmation, String, required: true
      argument :telephone, String, required: true
      argument :accept_terms, Boolean, required: true

      return_type Types::UserType

      def resolve(full_name:, email:, password:, password_confirmation:, telephone:, accept_terms:) # rubocop:disable Metrics/ParameterLists
        super
        AuthService.new.sign_up(full_name, email, password, password_confirmation, telephone, accept_terms)
      end
    end
  end
end
