const Generator = require('yeoman-generator');
const path = require('path');
const fs = require('fs');
const { handlePrompt } = require('../../lib/utils');

class AuthGenerator extends Generator {
  constructor(args, opts) {
    super(args, opts);
    
    // Add force option
    this.option('force', {
      type: Boolean,
      description: 'Force overwrite files without confirmation',
      default: true
    });
    
    // Add debug option
    this.option('debug', {
      desc: 'Enable debug mode',
      type: Boolean,
      default: false
    });
    
    // Fixed values for folder name and destination path
    this.folderName = 'user_mutations';
    this.destinationPath = 'backend/app/graphql/mutations';
    this.serviceDestinationPath = 'backend/app/services';
    this.mutationTypePath = 'backend/app/graphql/types/mutation_type.rb';
    this.backendPath = 'backend';
    
    // Fields to exclude from the User model when generating arguments
    this.excludedFields = [
      'encrypted_password',
      'reset_password_token',
      'reset_password_sent_at',
      'remember_created_at',
      'reset_password_token_expires_at',
      'role',
      'created_at',
      'updated_at',
      '_id',
      'id'
    ];

    // Track modified files
    this.modifiedFiles = [];
  }

  _getUserModelFields() {
    const userModelPath = path.join(process.cwd(), 'backend/app/models/user.rb');
    if (!fs.existsSync(userModelPath)) {
      this.log('User model not found at: ' + userModelPath);
      return [];
    }

    const content = fs.readFileSync(userModelPath, 'utf8');
    const fields = [];
    
    // Match field definitions in the model
    const fieldRegex = /field\s+:(\w+),\s+type:\s+(\w+)(?:,\s+default:\s+([^,\n]+))?/g;
    let match;
    
    while ((match = fieldRegex.exec(content)) !== null) {
      const [, fieldName, fieldType] = match;
      // Skip excluded fields
      if (!this.excludedFields.includes(fieldName)) {
        fields.push({
          name: fieldName,
          type: this._convertRubyTypeToGraphQL(fieldType)
        });
      }
    }

    // Add password field which might not be defined as a field in the model
    if (!fields.some(f => f.name === 'password')) {
      fields.push({
        name: 'password',
        type: 'String'
      });
    }

    return fields;
  }

  _convertRubyTypeToGraphQL(rubyType) {
    const typeMap = {
      'String': 'String',
      'Integer': 'Int',
      'Float': 'Float',
      'Boolean': 'Boolean',
      'Time': 'GraphQL::Types::ISO8601DateTime',
      'Date': 'GraphQL::Types::ISO8601Date',
      'DateTime': 'GraphQL::Types::ISO8601DateTime',
      'Hash': 'GraphQL::Types::JSON',
      'Array': 'GraphQL::Types::JSON'
    };

    return typeMap[rubyType] || 'String';
  }

  async prompting() {
    this.answers = await handlePrompt(this, [
      {
        type: 'confirm',
        name: 'confirmInstallation',
        message: 'Are you sure you want to set up authentication?',
        default: false
      },
      {
        type: 'confirm',
        name: 'includeSignIn',
        message: 'Include sign in mutation?',
        default: true
      },
      {
        type: 'confirm',
        name: 'includeLogout',
        message: 'Include logout mutation?',
        default: true
      },
      {
        type: 'confirm',
        name: 'includePasswordReset',
        message: 'Include password reset mutation?',
        default: true
      },
      {
        type: 'confirm',
        name: 'includeUpdatePassword',
        message: 'Include update password mutation?',
        default: true
      },
      {
        type: 'confirm',
        name: 'includeOtpRequest',
        message: 'Include OTP request mutation?',
        default: true
      },
      {
        type: 'confirm',
        name: 'includeSetupTwoFactor',
        message: 'Include setup two-factor mutation?',
        default: true
      },
      {
        type: 'confirm',
        name: 'includeVerifyTwoFactorSetup',
        message: 'Include verify two-factor setup mutation?',
        default: true
      }
    ]);
    
    if (!this.answers.confirmInstallation) {
      this.log('Operation cancelled.');
      process.exit(0);
    }
  }

  async initializing() {
    // Check if User model exists
    const userModelPath = path.join('backend', 'app', 'models', 'user.rb');
    if (!fs.existsSync(userModelPath)) {
      this.log('❌ Error: User model not found. Please create a User model first.');
      this.log('You can create a User model by running:');
      this.log('rapid schema:create');
      this.log('rapid schema:run');
      process.exit(1);
    }

    this.log('✓ Found User model');

    this.log('This generator will set up authentication in your Rails API application.');
    
    if (this.options.force) {
      this.log('Force mode enabled - files will be overwritten without confirmation');
    }

    // Create models directory if it doesn't exist
    const modelsPath = 'backend/app/models';
    if (!fs.existsSync(modelsPath)) {
      fs.mkdirSync(modelsPath, { recursive: true });
    }

    // Create JWT denylist model
    this.log('Creating JWT denylist model...');
    try {
      const jwtDenylistTemplate = fs.readFileSync(this.templatePath('models', 'jwt_denylist.rb.erb'), 'utf8');
      fs.writeFileSync(path.join(modelsPath, 'jwt_denylist.rb'), jwtDenylistTemplate);
      this.log('JWT denylist model created successfully');
    } catch (error) {
      this.log(`Error creating JWT denylist model: ${error.message}`);
      throw new Error(`Failed to create JWT denylist model: ${error.message}`);
    }

    // Create OTP model
    this.log('Creating OTP model...');
    try {
      const otpTemplate = fs.readFileSync(this.templatePath('models', 'otp.rb.erb'), 'utf8');
      fs.writeFileSync(path.join(modelsPath, 'otp.rb'), otpTemplate);
      this.log('OTP model created successfully');
    } catch (error) {
      this.log(`Error creating OTP model: ${error.message}`);
      throw new Error(`Failed to create OTP model: ${error.message}`);
    }

    // Create TwoFactor model
    this.log('Creating TwoFactor model...');
    try {
      const twoFactorTemplate = fs.readFileSync(this.templatePath('models', 'two_factor.rb.erb'), 'utf8');
      fs.writeFileSync(path.join(modelsPath, 'two_factor.rb'), twoFactorTemplate);
      this.log('TwoFactor model created successfully'); 
    } catch (error) {
      this.log(`Error creating TwoFactor model: ${error.message}`);
      throw new Error(`Failed to create TwoFactor model: ${error.message}`);
    }
  }

  writing() {
    // Generate mutations
    const destPath = path.join(this.destinationPath, this.folderName);
    
    // Create the destination directory if it doesn't exist
    if (!fs.existsSync(destPath)) {
      this.log(`Creating directory: ${destPath}`);
      fs.mkdirSync(destPath, { recursive: true });
    }

    // Generate the selected mutation files
    this._generateMutationFiles(destPath);

    // Always generate AuthService
    this._generateAuthService();

    // Update the mutation_type.rb file
    this._updateMutationType();

    // Update the user_type.rb file with two-factor field
    this._updateUserType();

    // Copy two-factor authentication types
    this._copyTwoFactorTypes();
  }

  _generateMutationFiles(destPath) {
    const mutations = [
      { name: 'sign_in', include: this.answers.includeSignIn },
      { name: 'logout', include: this.answers.includeLogout },
      { name: 'password_reset', include: this.answers.includePasswordReset },
      { name: 'update_password', include: this.answers.includeUpdatePassword },
      { name: 'otp_request', include: this.answers.includeOtpRequest },
      { name: 'setup_two_factor', include: this.answers.includeSetupTwoFactor },
      { name: 'verify_two_factor_setup', include: this.answers.includeVerifyTwoFactorSetup }
    ];

    mutations.forEach(mutation => {
      if (mutation.include) {
        this.log(`Generating ${mutation.name}.rb`);
        
        // Convert snake_case to CamelCase for class name
        const className = mutation.name
          .split('_')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join('');
        
        this.fs.copyTpl(
          this.templatePath('mutations', `${mutation.name}.rb.ejs`),
          path.join(destPath, `${mutation.name}.rb`),
          {
            className,
            moduleName: this.folderName
              .split('_')
              .map(part => part.charAt(0).toUpperCase() + part.slice(1))
              .join(''),
            fields: this._getUserModelFields()
          },
          {},
          { force: this.options.force }
        );
      }
    });
  }

  _generateAuthService() {
    const servicePath = path.join(this.serviceDestinationPath, 'auth_service.rb');
    
    this.log(`Generating auth_service.rb`);
    
    // Create the services directory if it doesn't exist
    if (!fs.existsSync(this.serviceDestinationPath)) {
      this.log(`Creating directory: ${this.serviceDestinationPath}`);
      fs.mkdirSync(this.serviceDestinationPath, { recursive: true });
    }
    
    // Generate the AuthService
    this.fs.copyTpl(
      this.templatePath('services', 'auth_service.rb.ejs'),
      servicePath,
      {
        userFields: this._getUserModelFields()
      },
      {},
      { force: this.options.force }
    );
  }

  _updateMutationType() {
    const mutationTypePath = path.join(process.cwd(), this.mutationTypePath);

    if (!fs.existsSync(mutationTypePath)) {
      this.log.error(`Mutation type file not found at: ${mutationTypePath}`);
      return;
    }

    this.log(`Updating mutation_type.rb with auth mutations`);

    let content = fs.readFileSync(mutationTypePath, 'utf8');
    
    // First fix any malformed end statements on the same line as fields
    content = content.replace(/(\S+.*?)\s+end(\s*)$/gm, '$1\n  end$2');
    
    // Split the content into lines for better structure handling
    let lines = content.split('\n');
    
    // Find the class definition
    const classLineIndex = lines.findIndex(line => line.includes('class MutationType'));
    
    if (classLineIndex === -1) {
      this.log.error('Could not find class definition in mutation_type.rb');
      return;
    }

    // Find the end of the class
    const classEndIndex = lines.findIndex((line, index) => 
      index > classLineIndex && line.trim() === 'end'
    );

    if (classEndIndex === -1) {
      this.log.error('Could not find end of class in mutation_type.rb');
      return;
    }

    // Get the mutations to add
    const mutations = [
      { name: 'signIn', snakeName: 'sign_in', include: this.answers.includeSignIn },
      { name: 'logout', snakeName: 'logout', include: this.answers.includeLogout },
      { name: 'passwordReset', snakeName: 'password_reset', include: this.answers.includePasswordReset },
      { name: 'updatePassword', snakeName: 'update_password', include: this.answers.includeUpdatePassword },
      { name: 'otpRequest', snakeName: 'otp_request', include: this.answers.includeOtpRequest },
      { name: 'setupTwoFactor', snakeName: 'setup_two_factor', include: this.answers.includeSetupTwoFactor },
      { name: 'verifyTwoFactorSetup', snakeName: 'verify_two_factor_setup', include: this.answers.includeVerifyTwoFactorSetup }
    ];

    // Check if there's a user mutations section comment
    const userMutationsCommentIndex = lines.findIndex(line => 
      line.includes('# User-related mutations') || line.includes('# User mutations')
    );

    // If there's no user mutations comment, add one before adding the mutations
    if (userMutationsCommentIndex === -1) {
      lines.splice(classLineIndex + 1, 0, '    # User-related mutations');
    }

    // Add each mutation if it doesn't already exist
    mutations.forEach(mutation => {
      if (mutation.include) {
        const moduleName = this.folderName
          .split('_')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join('');
        
        const mutationLine = `    field :${mutation.name}, mutation: Mutations::${moduleName}::${this._snakeToCamelCase(mutation.snakeName)}`;
        
        // Check if this mutation already exists
        const mutationExists = lines.some(line => 
          line.includes(`field :${mutation.name}`) && 
          line.includes(`Mutations::${moduleName}::${this._snakeToCamelCase(mutation.snakeName)}`)
        );

        if (!mutationExists) {
          // Find the best place to insert the mutation
          let insertIndex;
          
          if (userMutationsCommentIndex !== -1) {
            // Insert after the user mutations comment
            insertIndex = userMutationsCommentIndex + 1;
          } else {
            // Insert after the class definition
            insertIndex = classLineIndex + 2;
          }

          // Insert the mutation
          lines.splice(insertIndex, 0, mutationLine);
          this.log(`Added ${mutation.name} mutation to mutation_type.rb`);
        } else {
          this.log(`Mutation ${mutation.name} already exists in mutation_type.rb`);
        }
      }
    });

    // Write the updated content back to the file
    fs.writeFileSync(mutationTypePath, lines.join('\n'), 'utf8');
  }

  _snakeToCamelCase(str) {
    return str
      .split('_')
      .map((part, index) => {
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join('');
  }

  _updateUserType() {
    const userTypePath = path.join(this.backendPath, 'app', 'graphql', 'types', 'user_type.rb');
    
    if (!fs.existsSync(userTypePath)) {
      this.log('❌ User type file not found. Skipping two-factor field addition.');
      return;
    }

    const twoFactorField = 'field :two_factor, Types::TwoFactorType, null: true # has_one';
    let content = fs.readFileSync(userTypePath, 'utf8');

    // Check if the field already exists
    if (content.includes(twoFactorField)) {
      this.log('✓ Two-factor field already exists in user_type.rb');
      return;
    }

    // Find the class definition
    const classLineIndex = content.indexOf('class UserType < Types::BaseObject');
    if (classLineIndex === -1) {
      this.log('❌ Could not find UserType class definition');
      return;
    }

    // Find the first field definition after the class
    const firstFieldIndex = content.indexOf('field :', classLineIndex);
    if (firstFieldIndex === -1) {
      this.log('❌ Could not find any field definitions in UserType');
      return;
    }

    // Insert the two-factor field before the first field
    const newContent = content.slice(0, firstFieldIndex) + 
                      '  ' + twoFactorField + '\n\n' + 
                      content.slice(firstFieldIndex);

    fs.writeFileSync(userTypePath, newContent);
    this.log('✓ Added two-factor field to user_type.rb');
  }

  _copyTwoFactorTypes() {
    const sourceTypesPath = this.templatePath('types');
    const destTypesPath = path.join(this.backendPath, 'app', 'graphql', 'types');
    
    // Ensure destination directory exists
    if (!fs.existsSync(destTypesPath)) {
      fs.mkdirSync(destTypesPath, { recursive: true });
    }
    
    // Copy two_factor_type.rb
    const twoFactorTypeSource = path.join(sourceTypesPath, 'two_factor_type.rb.ejs');
    const twoFactorTypeDest = path.join(destTypesPath, 'two_factor_type.rb');
    
    if (fs.existsSync(twoFactorTypeSource)) {
      this.fs.copyTpl(
        twoFactorTypeSource,
        twoFactorTypeDest,
        {}
      );
      this.log('✓ Copied two_factor_type.rb');
    }
    
    // Copy two_factor_inputs.rb
    const twoFactorInputsSource = path.join(sourceTypesPath, 'two_factor_inputs.rb.ejs');
    const twoFactorInputsDest = path.join(destTypesPath, 'two_factor_inputs.rb');
    
    if (fs.existsSync(twoFactorInputsSource)) {
      this.fs.copyTpl(
        twoFactorInputsSource,
        twoFactorInputsDest,
        {}
      );
      this.log('✓ Copied two_factor_inputs.rb');
    }
  }
}

module.exports = AuthGenerator; 