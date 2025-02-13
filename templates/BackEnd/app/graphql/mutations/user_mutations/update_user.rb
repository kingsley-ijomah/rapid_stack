# frozen_string_literal: true

module Mutations
  module UserMutations
    # Update user password mutation
    class UpdateUser < Mutations::BaseMutation
      # Define the input arguments for the mutation
      argument :full_name, String, required: true
      argument :email, String, required: true
      argument :telephone, String, required: true

      return_type Types::UserType
      require_permission :ensure_all_groups

      before_action :check_permission

      def resolve(full_name:, email:, telephone:)
        super
        user = context[:current_user]
        AuthService.new.update_user(user, { full_name:, email:, telephone: })
      end
    end
  end
end
