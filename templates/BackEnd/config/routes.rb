# config/routes.rb
Rails.application.routes.draw do
  if Rails.env.development?
    mount GraphiQL::Rails::Engine, at: "/graphiql", graphql_path: "/graphql"
    mount LetterOpenerWeb::Engine, at: "/letter_opener"
  end
  post "/graphql", to: "graphql#execute"
end
