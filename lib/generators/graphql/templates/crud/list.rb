# frozen_string_literal: true

module Queries
  module <%= capitalizedPluralName %>Queries
    # List<%= capitalizedPluralName %> query
    class List<%= capitalizedPluralName %> < Queries::BaseQuery
      argument :page, Integer, required: false
      argument :per_page, Integer, required: false
      argument :order_direction, String, required: false
      argument :filters, GraphQL::Types::JSON, required: false

      return_type [Types::<%= name %>Type]

      require_permission :<%= permission %>

      def resolve(page: 1, per_page: 10, order_direction: 'asc', filters: {})
        list_records(<%= name %>, {
          filters: filters,
          page: page,
          per_page: per_page,
          order_direction: order_direction
        })
      end
    end
  end
end
