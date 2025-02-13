# frozen_string_literal: true

module Mutations
  # Base mutation class
  class BaseMutation < GraphQL::Schema::RelayClassicMutation
    argument_class Types::BaseArgument
    field_class Types::BaseField
    input_object_class Types::BaseInputObject
    object_class Types::BaseObject

    include SharedGraphqlMethods
    include ServiceResponse
    include Paginatable

    # The resolve method, which child mutations should override
    def resolve(**args)
      # Run all the before actions
      run_before_actions(args).tap { |result| return result if result }
    end

    # Common method to handle creating a record
    def create_record(model_class, attributes)
      # Create a new record with the attributes
      record = model_class.new(attributes)

      if record.save
        success_response(data: record)
      else
        failure_response(errors: record.errors.full_messages)
      end
    end

    def update_record(model_class, attributes)
      # Remove the id from the attributes
      id = attributes.delete(:id)

      record = model_class.find(id)

      if record.update(attributes)
        success_response(data: record)
      else
        failure_response(errors: record.errors.full_messages)
      end
    end

    def delete_record(model_class, id)
      # Check if the record exists
      check_not_found(model_class, id).tap do |result|
        return result if result
      end

      record = model_class.find(id)

      if record.destroy
        success_response(data: record)
      else
        failure_response(errors: record.errors.full_messages)
      end
    end

    # Get the current user
    def current_user
      context[:current_user]
    end

    # Get the current user's school
    def school
      current_user.school
    end

    # Common method to handle progress updates
    def handle_progress_update(progress)
      if progress.persisted?
        success_response(data: progress)
      else
        failure_response(errors: progress.errors.full_messages)
      end
    end

    # Common method to mark a record as in progress
    def mark_as_in_progress(model_class, id)
      # Check if record exists
      check_not_found(model_class, id).tap do |result|
        return result if result
      end

      record = model_class.find(id)

      # Check if current user exists
      return failure_response(errors: ["User not found"]) unless current_user

      begin
        progress = record.mark_as_in_progress(current_user)
        handle_progress_update(progress)
      rescue StandardError => e
        failure_response(errors: [e.message])
      end
    end
  end
end
