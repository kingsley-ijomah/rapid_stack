# app/services/concerns/service_response.rb

module ServiceResponse # rubocop:disable Style/Documentation
  def success_response(data:, message: 'Operation successful', http_status: 200, options: nil)
    response = {
      data:,
      errors: [],
      message:,
      http_status:
    }
    response[:options] = options if options.present?
    response
  end

  def failure_response(errors:, message: 'Operation failed', http_status: 422, options: nil)
    response = {
      data: nil,
      errors:,
      message:,
      http_status:
    }
    response[:options] = options if options.present?
    response
  end
end
