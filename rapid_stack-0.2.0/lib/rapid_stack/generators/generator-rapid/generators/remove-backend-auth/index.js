const Generator = require('yeoman-generator');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');

class RemoveBackendAuthGenerator extends Generator {
  constructor(args, opts) {
    super(args, opts);
    
    // Add force option
    this.option('force', {
      type: Boolean,
      description: 'Force removal without confirmation',
      default: true
    });
    
    // Fixed values for folder name and destination path
    this.folderName = 'user_mutations';
    this.destinationPath = 'backend/app/graphql/mutations';
    this.serviceDestinationPath = 'backend/app/services';
    this.mutationTypePath = 'backend/app/graphql/types/mutation_type.rb';
    
    // List of mutation files that might have been created
    this.mutationFiles = [
      'sign_in.rb',
      'sign_up.rb',
      'logout.rb',
      'password_reset.rb',
      'update_password.rb',
      'otp_request.rb',
      'update_user.rb'
    ];
    
    // List of mutation fields in mutation_type.rb
    this.mutationFields = [
      'signIn',
      'signUp',
      'logout',
      'passwordReset',
      'updatePassword',
      'otpRequest',
      'updateUser'
    ];
  }

  initializing() {
    this.log('This generator will remove the authentication files created by the backend-auth generator.');
    
    if (this.options.force) {
      this.log('Force mode enabled - files will be removed without confirmation');
    }
  }

  async prompting() {
    this.answers = await this.prompt([
      {
        type: 'confirm',
        name: 'confirmRemoval',
        message: 'Are you sure you want to remove all authentication files?',
        default: false
      }
    ]);
    
    if (!this.answers.confirmRemoval) {
      this.log('Operation cancelled.');
      process.exit(0);
    }
  }

  writing() {
    // Remove models
    this.log('Removing auth-related models...');
    try {
      // Remove JWT denylist model
      const jwtDenylistPath = path.join(process.cwd(), 'backend/app/models/jwt_denylist.rb');
      if (fs.existsSync(jwtDenylistPath)) {
        fs.unlinkSync(jwtDenylistPath);
        this.log('Removed JWT denylist model');
      }

      // Remove OTP model
      const otpPath = path.join(process.cwd(), 'backend/app/models/otp.rb');
      if (fs.existsSync(otpPath)) {
        fs.unlinkSync(otpPath);
        this.log('Removed OTP model');
      }

      // Remove models directory if it's empty
      const modelsPath = path.join(process.cwd(), 'backend/app/models');
      if (fs.existsSync(modelsPath)) {
        const files = fs.readdirSync(modelsPath);
        if (files.length === 0) {
          fs.rmdirSync(modelsPath);
          this.log('Removed empty models directory');
        }
      }
    } catch (error) {
      this.log(`Error removing auth models: ${error.message}`);
      throw new Error(`Failed to remove auth models: ${error.message}`);
    }

    // Remove mutation files
    this._removeMutationFiles();
    
    // Remove AuthService
    this._removeAuthService();
    
    // Update mutation_type.rb
    this._updateMutationType();
  }

  _removeMutationFiles() {
    const destPath = path.join(process.cwd(), this.destinationPath, this.folderName);
    
    if (!fs.existsSync(destPath)) {
      this.log(`Directory not found: ${destPath}`);
      return;
    }
    
    this.log(`Removing mutation files from ${destPath}`);
    
    this.mutationFiles.forEach(file => {
      const filePath = path.join(destPath, file);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.log(`Removed ${file}`);
      } else {
        this.log(`File not found: ${file}`);
      }
    });
    
    // Check if the directory is empty and remove it if it is
    if (fs.existsSync(destPath) && fs.readdirSync(destPath).length === 0) {
      rimraf.sync(destPath);
      this.log(`Removed empty directory: ${destPath}`);
    }
  }

  _removeAuthService() {
    const servicePath = path.join(process.cwd(), this.serviceDestinationPath, 'auth_service.rb');
    
    if (fs.existsSync(servicePath)) {
      this.log(`Removing auth_service.rb`);
      fs.unlinkSync(servicePath);
    } else {
      this.log(`File not found: auth_service.rb`);
    }
  }

  _updateMutationType() {
    const mutationTypePath = path.join(process.cwd(), this.mutationTypePath);

    if (!fs.existsSync(mutationTypePath)) {
      this.log.error(`Mutation type file not found at: ${mutationTypePath}`);
      return;
    }

    this.log(`Updating mutation_type.rb to remove auth mutations`);

    let content = fs.readFileSync(mutationTypePath, 'utf8');
    
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

    // Find and remove the user mutations section comment
    const userMutationsCommentIndex = lines.findIndex((line, index) => 
      index > classLineIndex && 
      index < classEndIndex && 
      (line.includes('# User-related mutations') || line.includes('# User mutations'))
    );

    // Remove each mutation field
    const moduleName = this.folderName
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
    
    // Create a new array of lines, excluding the mutation fields
    const newLines = lines.filter((line, index) => {
      // Keep lines outside the class
      if (index <= classLineIndex || index >= classEndIndex) {
        return true;
      }
      
      // Remove the user mutations comment
      if (index === userMutationsCommentIndex) {
        this.log('Removed user mutations comment');
        return false;
      }
      
      // Check if this line contains any of the mutation fields
      for (const field of this.mutationFields) {
        if (line.includes(`field :${field}`) && line.includes(`Mutations::${moduleName}::`)) {
          this.log(`Removed ${field} mutation from mutation_type.rb`);
          return false;
        }
      }
      
      // Keep all other lines
      return true;
    });
    
    // Write the updated content back to the file
    fs.writeFileSync(mutationTypePath, newLines.join('\n'), 'utf8');
  }

  end() {
    this.log('Authentication files have been removed successfully.');
  }
}

module.exports = RemoveBackendAuthGenerator; 