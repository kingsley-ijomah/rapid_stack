# frozen_string_literal: true

module Mutations
  module <%= name %>Mutations
    # Delete<%= name %> mutation
    class Delete<%= name %> < Mutations::BaseMutation
      argument :id, ID, required: true

      return_type Types::<%= name %>Type
      require_permission :<%= permission %>

      def resolve(id:)
        super
        delete_record(<%= name %>, id)
      end
    end
  end
end
