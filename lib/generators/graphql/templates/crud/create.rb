# frozen_string_literal: true

module Mutations
  module <%= name %>Mutations
    # Create<%= name %> mutation
    class Create<%= name %> < Mutations::BaseMutation
      # Define the input arguments for the mutation
<% fields.forEach(function(field) { -%>
      argument :<%= field.name %>, <%= field.type %>, required: false
<% }); -%>
<% if (name === 'User') { -%>
      argument :password, String, required: true
      argument :password_confirmation, String, required: true
      argument :company_code, String, required: true
<% } -%>

      return_type Types::<%= name %>Type
      require_permission :<%= permission %>

      def resolve(**kwargs)
        super
        create_record(<%= name %>, kwargs)
      end
    end
  end
end
