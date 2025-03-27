# frozen_string_literal: true

module Mutations
  module <%= modelName %>Mutations
    # <%= name %> mutation
    class <%= name %> < Mutations::BaseMutation
      # Define the input arguments for the mutation
<% fields.forEach(function(field) { -%>
      argument :<%= field.name %>, <%= field.type %>, required: <%= field.required !== false %>
<% }); %>

      return_type Types::<%= modelName %>Type
      require_permission :<%= permission %>

      def resolve(**kwargs)
        super
<% if (isCreate) { -%>
        create_record(<%= modelName %>, kwargs)
<% } else if (isUpdate) { -%>
        update_record(<%= modelName %>, kwargs)
<% } else if (isDelete) { -%>
        delete_record(<%= modelName %>, kwargs[:id])
<% } else { -%>
        # Custom implementation for <%= name %>
        record = <%= modelName %>.new(kwargs)

        if record.save
          success_response(data: record)
        else
          failure_response(errors: record.errors.full_messages)
        end
<% } -%>
      end
    end
  end
end
