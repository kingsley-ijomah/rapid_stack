# frozen_string_literal: true

module Mutations
  module UserMutations
    # User logout mutation
    class Logout < Mutations::BaseMutation
      return_type Types::UserType
      require_permission :ensure_all_groups

      before_action :check_permission

      def resolve
        super
        user = context[:current_user]
        jwt_payload = context[:jwt_payload]

        AuthService.new.logout(user, jwt_payload)
      end
    end
  end
end
