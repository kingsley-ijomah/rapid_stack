class User
  include Mongoid::Document
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable

  devise :database_authenticatable, :registerable,
          :recoverable, :rememberable, :validatable,
          :jwt_authenticatable, jwt_revocation_strategy: JwtDenylist


  ## Database authenticatable
  field :email,              type: String, default: ""
  field :encrypted_password, type: String, default: ""

  ## Recoverable
  field :reset_password_token,   type: String
  field :reset_password_sent_at, type: Time

  ## Rememberable
  field :remember_created_at, type: Time

  field :full_name, type: String
  field :telephone, type: String
  field :accept_terms, type: Boolean, default: false
  field :role, type: Integer, default: 0 # Default to 'guest'

  ## Trackable
  # field :sign_in_count,      type: Integer, default: 0
  # field :current_sign_in_at, type: Time
  # field :last_sign_in_at,    type: Time
  # field :current_sign_in_ip, type: String
  # field :last_sign_in_ip,    type: String

  ## Confirmable
  # field :confirmation_token,   type: String
  # field :confirmed_at,         type: Time
  # field :confirmation_sent_at, type: Time
  # field :unconfirmed_email,    type: String # Only if using reconfirmable

  ## Lockable
  # field :failed_attempts, type: Integer, default: 0 # Only if lock strategy is :failed_attempts
  # field :unlock_token,    type: String # Only if unlock strategy is :email or :both
  # field :locked_at,       type: Time
  include Mongoid::Timestamps
  # Define roles similar to an enum
  ROLES = { guest: 0, admin: 1, platform_admin: 2 }.freeze

  # Add validation to ensure the role is valid
  # Add validation to ensure the role is valid
  validates :role, inclusion: { in: ROLES.values }
  validates :full_name, presence: true, length: { minimum: 4 }
  validates :full_name, format: { with: /\A[a-zA-Z]+\s[a-zA-Z]+\z/ }
  validates :telephone, presence: true, numericality: true
  validates :password, presence: true, length: { minimum: 8 }, on: %i[create update_password]
  validate :password_format, on: %i[create update_password]
  validates :accept_terms, acceptance: true

  # Dynamically define role predicate methods (e.g., admin?, student?)
  ROLES.each do |role_name, role_value|
    define_method("#{role_name}?") do
      role == role_value
    end
  end

  # Helper to set role using symbols, e.g., :admin, :student
  def role=(value)
    super(ROLES[value.to_sym] || value) # Convert symbol to integer or allow direct integer assignment
  end

  def password_format
    return if password.match?(/^(?=.*[A-Z])(?=.*[!@#\$%\^&\*])(?=.{8,})/)

    errors.add(:password, 'requires one uppercase letter and one special character')
  end
end
