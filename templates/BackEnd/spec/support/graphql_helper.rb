module GraphqlHelper
  def graphql_query(query:, variables: {}, context: {})
    BackEndSchema.execute(query, variables: variables, context: context)
  end
end
