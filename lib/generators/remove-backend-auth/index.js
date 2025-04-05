const Generator = require('yeoman-generator');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
    
    // Add force option
    this.option('force', {
      type: Boolean,
      description: 'Force remove files without confirmation',
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
  }

  async prompting() {
    this.answers = await this.prompt([
      {
        type: 'confirm',
        name: 'confirmRemoval',
        message: 'Are you sure you want to remove the authentication system?',
        default: false
      }
    ]);
    
    if (!this.answers.confirmRemoval) {
      this.log('Operation cancelled.');
      process.exit(0);
    }
  }

  async writing() {
    try {
      // Remove JWT denylist model
      this._removeFile('backend/app/models/jwt_denylist.rb');
      
      // Remove OTP model
      this._removeFile('backend/app/models/otp.rb');
      
      // Remove TwoFactor model
      this._removeFile('backend/app/models/two_factor.rb');
      
      // Remove user mutations directory
      this._removeDirectory('backend/app/graphql/mutations/user_mutations');
      
      // Remove auth service
      this._removeFile('backend/app/services/auth_service.rb');
      
      // Remove two-factor types
      this._removeFile('backend/app/graphql/types/two_factor_type.rb');
      this._removeFile('backend/app/graphql/types/two_factor_inputs.rb');
      
      // Update mutation_type.rb to remove auth mutations
      this._updateMutationType();
      
      // Update user_type.rb to remove two-factor field
      this._updateUserType();
      
      // Update User model to remove two-factor relationship
      this._updateUserModel();
      
      // Remove gems from Gemfile
      this._updateGemfile();
      
    } catch (error) {
      this.log('Error during removal:', error.message);
      if (this.options.debug) {
        this.log('Stack trace:', error.stack);
      }
      process.exit(1);
    }
  }

  _removeFile(filePath) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this.log(`✓ Removed ${filePath}`);
    }
  }

  _removeDirectory(dirPath) {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      this.log(`✓ Removed directory ${dirPath}`);
    }
  }

  _updateMutationType() {
    const mutationTypePath = path.join(process.cwd(), this.mutationTypePath);
    
    if (!fs.existsSync(mutationTypePath)) {
      this.log('❌ Mutation type file not found');
      return;
    }

    let content = fs.readFileSync(mutationTypePath, 'utf8');
    
    // Remove auth mutations
    const mutationsToRemove = [
      'signIn',
      'logout',
      'passwordReset',
      'updatePassword',
      'otpRequest',
      'setupTwoFactor',
      'verifyTwoFactorSetup'
    ];

    mutationsToRemove.forEach(mutation => {
      const regex = new RegExp(`\\s*field\\s+:${mutation},\\s+mutation:\\s+Mutations::UserMutations::\\w+\\n`, 'g');
      content = content.replace(regex, '');
    });

    // Remove empty lines and extra spaces
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

    fs.writeFileSync(mutationTypePath, content);
    this.log('✓ Removed auth mutations from mutation_type.rb');
  }

  _updateUserType() {
    const userTypePath = path.join(this.backendPath, 'app', 'graphql', 'types', 'user_type.rb');
    
    if (!fs.existsSync(userTypePath)) {
      this.log('❌ User type file not found');
      return;
    }
  
    let content = fs.readFileSync(userTypePath, 'utf8');
    
    // Remove the two-factor field line using an anchored regex that only matches lines that start with the field definition.
    content = content.replace(/^[ \t]*field :two_factor, Types::TwoFactorType, null: true # has_one\s*\n/gm, '');
    
    // Optionally, clean up any triple (or more) consecutive newlines.
    content = content.replace(/\n{3,}/g, '\n\n');
  
    fs.writeFileSync(userTypePath, content);
    this.log('✓ Removed two-factor field from user_type.rb');
  }
  

  _updateUserModel() {
    const userModelPath = path.join(this.backendPath, 'app', 'models', 'user.rb');
    
    if (!fs.existsSync(userModelPath)) {
      this.log('❌ User model not found');
      return;
    }
  
    let content = fs.readFileSync(userModelPath, 'utf8');
  
    // Remove the two-factor relationship line using a multiline regex that matches the entire line.
    content = content.replace(/^[ \t]*#?[ \t]*has_one :two_factor\s*\n/gm, '');
  
    // If the "# Relationships" header is left with no relationship lines below it, remove it.
    // This regex matches a header followed immediately by a blank line.
    content = content.replace(/^(# Relationships\s*\n)(?=\s*\n)/m, '');
  
    // Remove any triple (or more) consecutive newlines.
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
  
    fs.writeFileSync(userModelPath, content);
    this.log('✓ Removed two-factor relationship from User model');
  }
  

  _updateGemfile() {
    const gemfilePath = path.join(this.backendPath, 'Gemfile');
    
    if (!fs.existsSync(gemfilePath)) {
      this.log('❌ Gemfile not found');
      return;
    }

    let content = fs.readFileSync(gemfilePath, 'utf8');
    
    // Remove auth-related gems
    const gemsToRemove = [
      'devise',
      'devise-jwt',
      'rotp',
      'rqrcode'
    ];

    gemsToRemove.forEach(gem => {
      const regex = new RegExp(`gem\\s+['"]${gem}['"].*\\n`, 'g');
      content = content.replace(regex, '');
    });

    // Remove empty lines and extra spaces
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

    fs.writeFileSync(gemfilePath, content);
    this.log('✓ Removed auth-related gems from Gemfile');
  }
}; 