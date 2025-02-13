# app/services/concerns/paginatable.rb
module Paginatable
  extend ActiveSupport::Concern
  include ServiceResponse

  included do
    # Adds pagination logic that can be reused
    def paginate(query, page: 1, per_page: 10)
      skip_count = (page - 1) * per_page
      paginated_data = query.skip(skip_count).limit(per_page)
      total_count = query.count
      total_pages = (total_count / per_page.to_f).ceil

      # Calculate previous and next page numbers
      prev_page = page > 1 ? page - 1 : nil
      next_page = page < total_pages ? page + 1 : nil

      # Return paginated data with meta (pagination) info
      success_response(
        data: paginated_data,
        options: {
          total_pages:,
          total_count:,
          current_page: page,
          per_page:,
          prev_page:,
          next_page:
        }
      )
    end
  end
end
