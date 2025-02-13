Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    if Rails.env.development?
      origins 'http://localhost:8100', 'http://127.0.0.1:8100'
    elsif Rails.env.production?
      origins 'https://your-production-domain.com' # Production origins
    end

    resource '*',
             headers: :any,
             methods: %i[get post put patch delete options head],
             credentials: true
  end
end
