module Types
  class UserType < Types::BaseObject
    field :id, ID, null: false
    field :full_name, String, null: false
    field :email, String, null: false
    field :telephone, String, null: false
    field :accept_terms, Boolean, null: false
    field :role, String, null: false
  end
end
