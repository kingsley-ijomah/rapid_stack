# frozen_string_literal: true

module Queries
  module <%= capitalizedPluralName %>Queries
    # Show<%= name %> query
    class Show<%= name %> < Queries::BaseQuery
      argument :id, ID, required: true

      return_type Types::<%= name %>Type
      require_permission :<%= permission %>

      def resolve(id:)
        show_record(<%= name %>, id)
      end
    end
  end
end
