# frozen_string_literal: true

module Mutations
  module <%= name %>Mutations
    # Update<%= name %> mutation
    class Update<%= name %> < Mutations::BaseMutation
<% fields.forEach(function(field) { -%>
      argument :<%= field.name %>, <%= field.type %>, required: false
<% }); -%>

      return_type Types::<%= name %>Type
      require_permission :<%= permission %>

      def resolve(**kwargs)
        super
        update_record(<%= name %>, kwargs)
      end
    end
  end
end
