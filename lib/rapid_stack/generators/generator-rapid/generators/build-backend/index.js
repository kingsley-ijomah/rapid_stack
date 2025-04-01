const Generator = require('yeoman-generator');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const semver = require('semver');
const axios = require('axios');
const yaml = require('yaml');
const { handlePrompt } = require('../../lib/utils');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
    
    // Add debug option
    this.option('debug', {
      desc: 'Enable debug mode',
      type: Boolean,
      default: false
    });

    // Track modified files
    this.modifiedFiles = [];

    // Initialize prompting flag
    this._isPromptingComplete = false;
  }

  destinationPath(...paths) {
    // First call the parent's destinationPath to get the base path
    const basePath = super.destinationPath(...paths);
    
    // Only prepend project name if:
    // 1. We have answers (prompting phase is complete)
    // 2. We have a project name
    // 3. The path doesn't already include the project name
    // 4. We're not in the initial setup phase
    if (this.answers?.projectName && 
        !basePath.includes(this.answers.projectName) && 
        this._isPromptingComplete) {
      // Prepend the project name to the path
      return path.join(process.cwd(), this.answers.projectName, ...paths);
    }
    
    return basePath;
  }

  async prompting() {
    // Get the currently installed Rails version
    let railsVersion;
    try {
      const railsVersionOutput = execSync('rails -v').toString();
      // Extract version number from output (e.g., "Rails 8.0.2" -> "8.0.2")
      railsVersion = railsVersionOutput.match(/Rails\s+([\d.]+)/)?.[1];
    } catch (error) {
      this.log('Error detecting Rails version:', error.message);
      process.exit(1);
    }

    // Set default project name to 'backend'
    this.answers = {
      projectName: 'backend',
      railsVersion: railsVersion
    };

    // Set flag indicating prompting is complete
    this._isPromptingComplete = true;
  }

  async checkPrerequisites() {
    try {
      // Check Ruby
      const rubyVersion = execSync('ruby -v').toString();
      this.log('Ruby version:', rubyVersion.trim());

      // Check Rails
      try {
        const railsVersion = execSync('rails -v').toString();
        this.log('Rails version:', railsVersion.trim());
      } catch (error) {
        const { installRails } = await handlePrompt(this, [{
          type: 'confirm',
          name: 'installRails',
          message: `Rails is not installed. Would you like to install Rails ${this.answers.railsVersion}?`,
          default: true
        }]);

        if (installRails) {
          this.log(`Installing Rails ${this.answers.railsVersion}...`);
          execSync(`gem install rails -v ${this.answers.railsVersion}`);
          this.log(`Rails ${this.answers.railsVersion} has been installed successfully.`);
        } else {
          this.log('Rails installation skipped. Please install Rails manually before continuing.');
          process.exit(1);
        }
      }

      // Check MongoDB
      try {
        const mongoVersion = execSync('mongod --version').toString();
        this.log('MongoDB is installed:', mongoVersion.split('\n')[0].trim());
      } catch (error) {
        this.log('Warning: MongoDB is not installed. You will need to install MongoDB before running your application.');
        const { continueMongo } = await handlePrompt(this, [{
          type: 'confirm',
          name: 'continueMongo',
          message: 'Would you like to continue without MongoDB?',
          default: false
        }]);

        if (!continueMongo) {
          this.log('Please install MongoDB and try again.');
          process.exit(1);
        }
      }
    } catch (error) {
      this.log('Error: Ruby is not installed. Please install Ruby before continuing.');
      process.exit(1);
    }
  }

  async configuring() {
    const { projectName } = this.answers;
    const projectPath = path.join(process.cwd(), projectName);
    
    // Check if project exists
    if (fs.existsSync(projectPath)) {
      const { action } = await handlePrompt(this, [{
        type: 'list',
        name: 'action',
        message: 'Project directory already exists. What would you like to do?',
        choices: [
          { name: 'Update existing project', value: 'update' },
          { name: 'Cancel installation', value: 'cancel' }
        ]
      }]);

      if (action === 'cancel') {
        this.log('Installation cancelled.');
        process.exit(0);
      }
    }
  }

  async _setupRailsProject() {
    const { railsVersion, projectName } = this.answers;
    const projectPath = path.join(process.cwd(), projectName);
  
    if (!fs.existsSync(projectPath)) {
      const { confirmCreate } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmCreate',
        message: `This will create a new Rails API application in: ${projectPath}\nAre you sure you want to continue?`,
        default: true
      }]);
  
      if (!confirmCreate) {
        this.log('Installation cancelled.');
        process.exit(0);
      }
  
      fs.mkdirSync(projectPath);
      // Set Yeoman's destination root to the project directory
      this.destinationRoot(projectPath);
      // (Optional) Also change process.cwd if needed:
      process.chdir(projectPath);
  
      // Create new Rails API application
      const command = [
        `rails _${railsVersion}_ new .`,
        '--api',
        '--skip-active-record',
        '--skip-test',
        '--skip-system-test',
        '--skip-bundle'
      ].join(' ');
  
      execSync(command, { stdio: 'inherit' });
      this.log('✓ Created new Rails API application');
    } else {
      // Update destination root to the existing project
      this.destinationRoot(projectPath);
      this.log('Using existing Rails application');
    }
  }

  async _setupGemfile() {
    const { railsVersion } = this.answers;
    
    try {
      const { confirmGemfile } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmGemfile',
        message: 'Would you like to set up the Gemfile?',
        default: true
      }]);

      if (confirmGemfile) {
        // Helper function to fetch gem version from RubyGems API
        const getGemVersion = async (gemName) => {
          try {
            const response = await axios.get(`https://rubygems.org/api/v1/versions/${gemName}.json`);
            const versions = response.data;
            
            // Filter versions that are compatible with our Rails version
            const compatibleVersions = versions
              .filter(v => {
                // Skip pre-release versions
                if (v.number.includes('rc') || v.number.includes('beta') || v.number.includes('alpha') || v.number.includes('pre')) {
                  return false;
                }

                // Check if the version has a Rails dependency
                const railsDependency = v.dependencies?.runtime?.find(d => d.name === 'rails');
                if (!railsDependency) return true; // If no Rails dependency, assume compatible
                
                // Parse the Rails requirement
                const requirement = railsDependency.requirements;
                return semver.satisfies(railsVersion, requirement);
              })
              .map(v => {
                // Clean up version number to ensure it's semantic
                const cleanVersion = v.number
                  .replace(/\.a\d+$/, '') // Remove alpha versions
                  .replace(/\.b\d+$/, '') // Remove beta versions
                  .replace(/\.rc\d+$/, '') // Remove release candidates
                  .replace(/\.pre\d+$/, '') // Remove pre-release versions
                  .split('.')
                  .slice(0, 3) // Only take first three parts (major.minor.patch)
                  .join('.');
                
                return {
                  original: v.number,
                  cleaned: cleanVersion
                };
              })
              .filter(v => semver.valid(v.cleaned)) // Only keep valid semantic versions
              .sort((a, b) => semver.compare(b.cleaned, a.cleaned)); // Sort by version, newest first
            
            if (compatibleVersions.length === 0) {
              this.log(`⚠️  No compatible version found for ${gemName} with Rails ${railsVersion}`);
              return null;
            }
            
            return `~> ${compatibleVersions[0].original}`;
          } catch (error) {
            this.log(`⚠️  Failed to fetch version for ${gemName}: ${error.message}`);
            return null;
          }
        };

        // Define gem categories and their gems
        const gemCategories = {
          core: {
            name: 'Core Rails',
            gems: [
              { name: 'rails', version: railsVersion },
              { name: 'stringio' },
              { name: 'bootsnap', options: 'require: false # Reduces boot times through caching' },
              { name: 'tzinfo-data', options: 'platforms: %i[windows jruby] # Windows time zone data' }
            ]
          },
          database: {
            name: 'Database',
            gems: [
              { name: 'mongoid' },
              { name: 'mongo', comment: '# MongoDB Ruby driver' }
            ]
          },
          authentication: {
            name: 'Authentication',
            gems: [
              { name: 'devise' },
              { name: 'devise-jwt' }
            ]
          },
          api: {
            name: 'API & GraphQL',
            gems: [
              { name: 'graphql' },
              { name: 'graphql-batch' },
              { name: 'apollo_upload_server' },
              { name: 'rack-cors' },
              { name: 'email_validator' }
            ]
          },
          http: {
            name: 'HTTP Clients',
            gems: [
              { name: 'httparty' },
              { name: 'vault' }
            ]
          },
          email: {
            name: 'Email',
            gems: [
              { name: 'postmark-rails' }
            ]
          },
          server: {
            name: 'Server',
            gems: [
              { name: 'puma' }
            ]
          },
          development: {
            name: 'Development and Test Environment',
            group: ':development, :test',
            gems: [
              { name: 'debug', options: 'platforms: %i[mri windows]' },
              { name: 'rspec-rails' },
              { name: 'factory_bot_rails' },
              { name: 'faker' },
              { name: 'database_cleaner-mongoid' },
              { name: 'webmock' },
              { name: 'dotenv-rails' },
              { name: 'guard' },
              { name: 'guard-rspec' },
              { name: 'simplecov', options: 'require: false' },
              { name: 'graphiql-rails' }
            ]
          },
          devOnly: {
            name: 'Development Environment',
            group: ':development',
            gems: [
              { name: 'propshaft' },
              { name: 'rubocop' },
              { name: 'rubocop-rails' },
              { name: 'letter_opener_web' }
            ]
          }
        };

        // Count total number of gems that need version fetching
        let totalGems = 0;
        let processedGems = 0;
        for (const [category, config] of Object.entries(gemCategories)) {
          totalGems += config.gems.filter(gem => !gem.version).length;
        }

        this.log('\nFetching gem versions...');

        // Function to update progress
        const updateProgress = () => {
          processedGems++;
          const progress = Math.round((processedGems / totalGems) * 100);
          const progressBar = '█'.repeat(progress / 2) + '░'.repeat(50 - progress / 2);
          this.log(`\r[${progressBar}] ${progress}% - Processed ${processedGems}/${totalGems} gems`);
        };

        // Fetch versions for all gems
        const gemVersions = {};

        // Process each category
        for (const [category, config] of Object.entries(gemCategories)) {
          for (const gem of config.gems) {
            if (gem.version) {
              gemVersions[gem.name] = gem.version;
            } else {
              const version = await getGemVersion(gem.name);
              if (version) {
                gemVersions[gem.name] = version;
              }
              updateProgress();
            }
          }
        }

        this.log('\nGenerating Gemfile...');

        // Generate Gemfile content
        let gemfileContent = "source 'https://rubygems.org'\n\n";

        // Process each category
        for (const [category, config] of Object.entries(gemCategories)) {
          // Add group if specified
          if (config.group) {
            gemfileContent += `group ${config.group} do\n`;
          }

          // Add category comment
          gemfileContent += `# ${config.name}\n`;

          // Add gems
          for (const gem of config.gems) {
            const version = gemVersions[gem.name] ? `"${gemVersions[gem.name]}"` : '';
            const options = gem.options ? `, ${gem.options}` : '';
            const comment = gem.comment ? ` ${gem.comment}` : '';
            gemfileContent += `  gem '${gem.name}'${version ? `, ${version}` : ''}${options}${comment}\n`;
          }

          // Close group if opened
          if (config.group) {
            gemfileContent += 'end\n';
          }

          gemfileContent += '\n';
        }

        // Write the Gemfile
        const gemfilePath = this.destinationPath('Gemfile');
        fs.writeFileSync(gemfilePath, gemfileContent);
        this.log(`✓ Updated Gemfile: ${this._fileLink('Gemfile')}`);
      }
    } catch (error) {
      this.log.error('Failed to setup Gemfile:', error);
      throw error;
    }
  }

  async _setupMongoid() {
    const { confirmMongoid } = await handlePrompt(this, [{
      type: 'confirm',
      name: 'confirmMongoid',
      message: 'Would you like to set up MongoDB configuration?',
      default: true
    }]);

    if (confirmMongoid) {
      this._copyTemplateFile('mongoid.yml.erb', 'config/mongoid.yml', {
        projectName: this.answers.projectName
      });
      this.log(`✓ Added MongoDB configuration: ${this._fileLink('config/mongoid.yml')}`);
    }
  }

  async _setupGraphQL() {
    const { confirmGraphQL } = await handlePrompt(this, [{
      type: 'confirm',
      name: 'confirmGraphQL',
      message: 'Would you like to set up GraphQL API?',
      default: true
    }]);
  
    if (confirmGraphQL) {
      const context = {
        projectName: this.answers.projectName
      };

      // Create necessary directories
      const directories = [
        'app/graphql/queries',
        'app/graphql/concerns',
        'app/graphql/mutations'
      ];

      this.log('\nCreating directories...');
      directories.forEach(dir => {
        const fullPath = this.destinationPath(dir);
        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath, { recursive: true });
          this.log(`✓ Created directory: ${dir}`);
        } else {
          this.log(`Directory already exists: ${dir}`);
        }
      });
  
      // Create shared GraphQL methods
      this._copyTemplateFile('app/graphql/shared_graphql_methods.rb.erb', 'app/graphql/concerns/shared_graphql_methods.rb', {}, { force: true });
      this._copyTemplateFile('app/graphql/mutations/base_mutation.rb.erb', 'app/graphql/mutations/base_mutation.rb', {}, { force: true });
      this._copyTemplateFile('app/graphql/queries/base_query.rb.erb', 'app/graphql/queries/base_query.rb', {}, { force: true });
      this._copyTemplateFile(
        'app/controllers/graphql_controller.rb.erb', 
        'app/controllers/graphql_controller.rb', 
        {
          projectName: this.answers.projectName
        },
        { force: true }
      );
      this._copyTemplateFile('app/graphql/types/query_type.rb.erb', 'app/graphql/types/query_type.rb', context, { force: true });
      this._copyTemplateFile('app/graphql/types/mutation_type.rb.erb', 'app/graphql/types/mutation_type.rb', context, { force: true });
    }
  }

  async _setupRoutes() {
    const { confirmRoutes } = await handlePrompt(this, [{
      type: 'confirm',
      name: 'confirmRoutes',
      message: 'Would you like to set up the routes configuration?',
      default: true
    }]);

    if (confirmRoutes) {
      this._copyTemplateFile('config/routes.rb.erb', 'config/routes.rb', {});
      this.log(`✓ Updated routes configuration: ${this._fileLink('config/routes.rb')}`);
    }
  }

  async _setupCORS() {
    const { confirmCORS } = await handlePrompt(this, [{
      type: 'confirm',
      name: 'confirmCORS',
      message: 'Would you like to set up CORS configuration?',
      default: true
    }]);

    if (confirmCORS) {
      this._copyTemplateFile('config/initializers/cors.rb.erb', 'config/initializers/cors.rb', {});
      this.log(`✓ Added CORS configuration: ${this._fileLink('config/initializers/cors.rb')}`);
    }
  }

  async _setupJWTHelper() {
    const { confirmJWTHelper } = await handlePrompt(this, [{
      type: 'confirm',
      name: 'confirmJWTHelper',
      message: 'Would you like to set up JWT test helper?',
      default: true
    }]);

    if (confirmJWTHelper) {
      try {
        // Ensure the support directory exists
        const supportDir = this.destinationPath('spec/support');
        if (!fs.existsSync(supportDir)) {
          fs.mkdirSync(supportDir, { recursive: true });
        }

        // Create JWT helper
        this._copyTemplateFile('spec/support/jwt_helper.rb.erb', 'spec/support/jwt_helper.rb', {});
        this.log(`✓ Created JWT test helper: ${this._fileLink('spec/support/jwt_helper.rb')}`);
      } catch (error) {
        this.log('Error setting up JWT helper:', error.message);
        if (this.options.debug) {
          this.log('Stack trace:', error.stack);
        }
        // Don't exit the process, just log the error and continue
      }
    }
  }

  async _setupRSpec() {
    const { confirmRSpec } = await handlePrompt(this, [{
      type: 'confirm',
      name: 'confirmRSpec',
      message: 'Would you like to set up RSpec for testing?',
      default: true
    }]);

    if (confirmRSpec) {
      try {
        // Create RSpec directories
        this.log('\nCreating RSpec directories...');
        const specDirs = [
          'spec/models',
          'spec/controllers',
          'spec/requests',
          'spec/support',
          'spec/factories'
        ];
        
        specDirs.forEach(dir => {
          const fullPath = this.destinationPath(dir);
          if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
            this.log(`✓ Created directory: ${dir}`);
          } else {
            this.log(`Directory already exists: ${dir}`);
          }
        });

        // Update spec_helper.rb with SimpleCov configuration
        this._copyTemplateFile('spec/spec_helper.rb.erb', 'spec/spec_helper.rb', {});
        this.log('✓ Updated spec_helper.rb with SimpleCov configuration');

        // Update rails_helper.rb with custom configuration
        this._copyTemplateFile('spec/rails_helper.rb.erb', 'spec/rails_helper.rb', {});
        this.log('✓ Updated rails_helper.rb with custom configuration');

        // Set up JWT helper
        await this._setupJWTHelper();
      } catch (error) {
        this.log('Error setting up RSpec:', error.message);
        if (this.options.debug) {
          this.log('Stack trace:', error.stack);
        }
        // Don't exit the process, just log the error and continue
      }
    }
  }

  async _setupGraphQLHelper() {
    const { confirmGraphQLHelper } = await handlePrompt(this, [{
      type: 'confirm',
      name: 'confirmGraphQLHelper',
      message: 'Would you like to set up GraphQL test helper?',
      default: true
    }]);

    if (confirmGraphQLHelper) {
      try {
        // Ensure the support directory exists
        const supportDir = this.destinationPath('spec/support');
        if (!fs.existsSync(supportDir)) {
          fs.mkdirSync(supportDir, { recursive: true });
        }

        // Create GraphQL helper
        this._copyTemplateFile('spec/support/graphql_helper.rb.erb', 'spec/support/graphql_helper.rb', {
          projectName: this.answers.projectName
        });
        this.log(`✓ Created GraphQL test helper: ${this._fileLink('spec/support/graphql_helper.rb')}`);
      } catch (error) {
        this.log('Error setting up GraphQL helper:', error.message);
        if (this.options.debug) {
          this.log('Stack trace:', error.stack);
        }
        // Don't exit the process, just log the error and continue
      }
    }
  }

  async _setupMailers() {
    const { confirmMailers } = await handlePrompt(this, [{
      type: 'confirm',
      name: 'confirmMailers',
      message: 'Would you like to set up email templates and mailers?',
      default: true
    }]);

    if (confirmMailers) {
      try {
        // Ensure the mailers directory exists
        const mailersPath = this.destinationPath('app/mailers');
        if (!fs.existsSync(mailersPath)) {
          fs.mkdirSync(mailersPath, { recursive: true });
        }

        // Create application mailer
        this._copyTemplateFile('app/mailers/application_mailer.rb.erb', 'app/mailers/application_mailer.rb', {});
        this.log(`✓ Created application mailer: ${this._fileLink('app/mailers/application_mailer.rb')}`);

        // Create user mailer
        this._copyTemplateFile('app/mailers/user_mailer.rb.erb', 'app/mailers/user_mailer.rb', {});
        this.log(`✓ Created user mailer: ${this._fileLink('app/mailers/user_mailer.rb')}`);

        // Create OTP email templates
        // Ensure the views directory exists
        const viewsPath = this.destinationPath('app/views/user_mailer');
        if (!fs.existsSync(viewsPath)) {
          fs.mkdirSync(viewsPath, { recursive: true });
        }

        // Create HTML template
        this.fs.copy(
          this.templatePath('app/views/user_mailer/otp_email.html.erb'),
          this.destinationPath('app/views/user_mailer/otp_email.html.erb')
        );
        this.log(`✓ Created HTML email template: ${this._fileLink('app/views/user_mailer/otp_email.html.erb')}`);

        // Create text template
        this.fs.copy(
          this.templatePath('app/views/user_mailer/otp_email.text.erb'),
          this.destinationPath('app/views/user_mailer/otp_email.text.erb')
        );
        this.log(`✓ Created text email template: ${this._fileLink('app/views/user_mailer/otp_email.text.erb')}`);

        // Force write to disk immediately
        this.fs.commit(() => {
          this._debugLog('Email templates copied successfully');
        });
      } catch (error) {
        this.log('Error setting up mailers:', error.message);
        if (this.options.debug) {
          this.log('Stack trace:', error.stack);
        }
        // Don't exit the process, just log the error and continue
      }
    }
  }

  async _setupGuard() {
    const { confirmGuard } = await handlePrompt(this, [{
      type: 'confirm',
      name: 'confirmGuard',
      message: 'Would you like to set up Guard for automated testing?',
      default: true
    }]);

    if (confirmGuard) {
      try {
        // Run Guard initialization
        execSync('bundle exec guard init rspec', { stdio: 'inherit' });
        this.log('✓ Initialized Guard');

        // Create custom Guardfile
        this._copyTemplateFile('Guardfile.erb', 'Guardfile', {});
        this.log(`✓ Created custom Guardfile: ${this._fileLink('Guardfile')}`);
      } catch (error) {
        this.log('Error setting up Guard:', error.message);
        if (this.options.debug) {
          this.log('Stack trace:', error.stack);
        }
        // Don't exit the process, just log the error and continue
      }
    }
  }

  async _setupServices() {
    const { confirmServices } = await handlePrompt(this, [{
      type: 'confirm',
      name: 'confirmServices',
      message: 'Would you like to set up services?',
      default: true
    }]);

    if (confirmServices) {
      try {
        // Create services directory
        const servicesPath = this.destinationPath('app/services');
        if (!fs.existsSync(servicesPath)) {
          fs.mkdirSync(servicesPath, { recursive: true });
        }

        // Create concerns directory
        const concernsPath = this.destinationPath('app/services/concerns');
        if (!fs.existsSync(concernsPath)) {
          fs.mkdirSync(concernsPath, { recursive: true });
        }

        this._copyTemplateFile('app/services/concerns/service_response.rb.erb', 'app/services/concerns/service_response.rb', {});
        this._copyTemplateFile('app/services/concerns/paginatable.rb.erb', 'app/services/concerns/paginatable.rb', {});
        this._copyTemplateFile('app/services/permission_checker.rb.erb', 'app/services/permission_checker.rb', {});

        this.log('\nCreated services:');
        this.log(`✓ Created permission checker: ${this._fileLink('app/services/permission_checker.rb')}`);
        this.log(`✓ Created service response: ${this._fileLink('app/services/concerns/service_response.rb')}`);
        this.log(`✓ Created paginatable: ${this._fileLink('app/services/concerns/paginatable.rb')}`);

      } catch (error) { 
        this.log('Error setting up services:', error.message);
        if (this.options.debug) {
          this.log('Stack trace:', error.stack);
        }
      }
    }
  }

  async _generateGraphQL() {
    const { confirmGenerateGraphQL } = await handlePrompt(this, [{
      type: 'confirm',
      name: 'confirmGenerateGraphQL',
      message: 'Would you like to generate GraphQL components?',
      default: true
    }]);

    if (confirmGenerateGraphQL) {
      try {
        // cd into the project directory
        process.chdir(this.destinationPath());
        this.log(`✓ Changed directory to: ${this.destinationPath()}`);

        // Run GraphQL generator with force flag to skip confirmations
        this.log('\nRunning GraphQL generator...');

        execSync('bundle exec rails generate graphql:install --skip-graphiql --skip-active-record --force', { stdio: 'inherit' });

        // Wait a moment to ensure files are written
        execSync('sleep 1');

        // Now set up our custom GraphQL files
        await this._setupGraphQL(true); // Pass true to force overwrite

        this.log('✓ Installed and configured GraphQL');
      } catch (error) {
        this.log('\n=== Error in _generateGraphQL ===');
        this.log(`Error Message: ${error.message}`);
        this.log(`Stack Trace: ${error.stack}`);
      }
    }
  }

  async _setupGraphQL(forceOverwrite = false) {
    // If called directly (not from _generateGraphQL), ask for confirmation
    let shouldProceed = forceOverwrite;
    if (!forceOverwrite) {
      const { confirmGraphQL } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmGraphQL',
        message: 'Would you like to set up GraphQL API?',
        default: true
      }]);
      shouldProceed = confirmGraphQL;
    }
  
    if (shouldProceed) {
      const context = {
        projectName: this.answers.projectName
      };

      // Create necessary directories
      const directories = [
        'app/graphql/queries',
        'app/graphql/concerns',
        'app/graphql/mutations'
      ];

      this.log('\nCreating directories...');
      directories.forEach(dir => {
        const fullPath = this.destinationPath(dir);
        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath, { recursive: true });
          this.log(`✓ Created directory: ${dir}`);
        }
      });
  
      // Always force overwrite when called from _generateGraphQL
      const options = { force: forceOverwrite };
  
      // Create shared GraphQL methods
      this._copyTemplateFile(
        'app/graphql/shared_graphql_methods.rb.erb',
        'app/graphql/concerns/shared_graphql_methods.rb',
        {},
        options
      );
      this._copyTemplateFile(
        'app/graphql/mutations/base_mutation.rb.erb',
        'app/graphql/mutations/base_mutation.rb',
        {},
        options
      );
      this._copyTemplateFile(
        'app/graphql/queries/base_query.rb.erb',
        'app/graphql/queries/base_query.rb',
        {},
        options
      );
      this._copyTemplateFile(
        'app/controllers/graphql_controller.rb.erb',
        'app/controllers/graphql_controller.rb',
        { projectName: this.answers.projectName },
        options
      );
      this._copyTemplateFile(
        'app/graphql/types/query_type.rb.erb',
        'app/graphql/types/query_type.rb',
        context,
        options
      );
      this._copyTemplateFile(
        'app/graphql/types/mutation_type.rb.erb',
        'app/graphql/types/mutation_type.rb',
        context,
        options
      );

      if (!forceOverwrite) {
        this.log(`✓ Set up GraphQL API with custom controllers and types`);
      }
    }
  }

  async _removeMasterKey() {
    this.log('\nRemoving master key...');

    const { confirmRemoveMasterKey } = await handlePrompt(this, [{
      type: 'confirm',
      name: 'confirmRemoveMasterKey',
      message: 'Would you like to remove the master key?',
      default: true
    }]);

    if (confirmRemoveMasterKey) {
      try {
          const masterKeyPath = this.destinationPath('config/master.key');
          const credentialsPath = this.destinationPath('config/credentials.yml.enc');

        // Remove master.key if it exists
        if (fs.existsSync(masterKeyPath)) {
          fs.unlinkSync(masterKeyPath);
          this._debugLog('Removed master.key file');
        }
        
        // Remove credentials.yml.enc if it exists
        if (fs.existsSync(credentialsPath)) {
          fs.unlinkSync(credentialsPath);
          this._debugLog('Removed credentials.yml.enc file');
        }
      } catch (error) {
        this.log('Error removing master key:', error.message);
      }
    }
  }

  async _setUpEnv() {
    const { confirmEnv } = await handlePrompt(this, [{
      type: 'confirm',
      name: 'confirmEnv',
      message: 'Would you like to set up the .env file?',
      default: true
    }]);

    if (confirmEnv) {
      try {
        this.log('\nSetting up .env file...');
      // Read the template file
      const envTemplate = fs.readFileSync(this.templatePath('env.development.erb'), 'utf8');

      // Replace project name in the template
      const envContent = envTemplate.replace(/<%= this.answers?.projectName %>/g, this.answers?.projectName);
            
      // Write the .env.sample file
      fs.writeFileSync('.env.sample', envContent);
      
      this.log(`✓ .env.sample file created: ${this._fileLink('.env.sample')}`);
      } catch (error) {
          this.log('Error setting up .env file:', error.message);
      }
    }
  }

  async _setUpConfigHelper() {
    const { confirmConfigHelper } = await handlePrompt(this, [{
      type: 'confirm',
      name: 'confirmConfigHelper',
      message: 'Would you like to set up the config helper?',
      default: true
    }]);

    if (confirmConfigHelper) {
      this.log('\nSetting up config helper...');
      
      this._copyTemplateFile('lib/config_helper.rb.erb', 'lib/config_helper.rb', {});

      this.log(`✓ Config helper created: ${this._fileLink('lib/config_helper.rb')}`);
    }
  }

  async _updateApplicationConfig() {
    const { confirmUpdateApplicationConfig } = await handlePrompt(this, [{
      type: 'confirm',
      name: 'confirmUpdateApplicationConfig',
      message: 'Would you like to update the application config?',
      default: true
    }]);

    if (confirmUpdateApplicationConfig) {
      this.log('\nUpdating application config...');
      const railsVersion = this.answers.railsVersion;
      const projectName = this.answers.projectName;
      const majorMinorVersion = railsVersion.split('.').slice(0, 2).join('.');

      // Ensure the directory exists
      if (!fs.existsSync('config')) {
        this._debugLog('Creating config directory...');
        fs.mkdirSync('config', { recursive: true });
      }

      // Copy the template with proper context
      this._copyTemplateFile(
        'config/application.rb.erb',
        'config/application.rb',
        {
          projectName: projectName,
          railsVersion: railsVersion
        }
      );

      this.log(`✓ Application config updated: ${this._fileLink('config/application.rb')}`);
    }
  }

  async _removeActiveRecordAppConfig() {
    const { confirmRemoveActiveRecordAppConfig } = await handlePrompt(this, [{
      type: 'confirm',
      name: 'confirmRemoveActiveRecordAppConfig',
      message: 'Would you like to remove the Active Record app config?',
      default: true
    }]);

    if (confirmRemoveActiveRecordAppConfig) {
      // Now remove the ActiveRecord query log block from the file
      let appConfigUpdated = fs.readFileSync(this.destinationPath('config/application.rb'), 'utf8');
      appConfigUpdated = appConfigUpdated.replace(
        /^\s*config\.active_record\.query_log_tags_enabled\s*=\s*true\s*\n\s*config\.active_record\.query_log_tags\s*=\s*\[[\s\S]*?\]\s*\n/m,
        ''
      );
      fs.writeFileSync(this.destinationPath('config/application.rb'), appConfigUpdated, 'utf8');

      this.log(`✓ Active Record app config removed: ${this._fileLink('config/application.rb')}`);
    }
  }

  async _setupDockerfile() {
    const { confirmDockerfile } = await handlePrompt(this, [{
      type: 'confirm',
      name: 'confirmDockerfile',
      message: 'Would you like to set up the Dockerfile?',
      default: true
    }]);

    if (confirmDockerfile) {
      this._copyTemplateFile('Dockerfile.erb', 'Dockerfile', {});

      this.log(`✓ Dockerfile created: ${this._fileLink('Dockerfile')}`);
    }
  }

  async _setupGithubActions() {
    const { confirmGithubActions } = await handlePrompt(this, [{
      type: 'confirm',
      name: 'confirmGithubActions',
      message: 'Would you like to set up the GitHub Actions?',
      default: true
    }]);
  
    if (confirmGithubActions) {
      try {  
        this._copyTemplateFile(
          '.github/workflows/backend-build.yml.erb', 
          '.github/workflows/backend-build.yml', {}
        );
        this.log(`✓ GitHub Actions created: ${this._fileLink('.github/workflows/backend-build.yml')}`);
      } catch (error) {
        this.log('Error setting up GitHub Actions:', error.message);
        if (this.options.debug) {
          this.log('Stack trace:', error.stack);
        }
      }
    }
  }

  async install() {
    const { projectName } = this.answers;
    const projectPath = path.join(process.cwd(), projectName);

    try {
      // Set up Rails project
      await this._setupRailsProject();

      // Set up Gemfile
      await this._setupGemfile();

      // Set up Mongoid
      await this._setupMongoid();

      // Set up GraphQL
      await this._setupGraphQL();

      // Set up Routes
      await this._setupRoutes();

      // Set up CORS
      await this._setupCORS();

      // Set up RSpec
      await this._setupRSpec();

      // Set up GraphQL Helper
      await this._setupGraphQLHelper();

      // Set up JWT Helper
      await this._setupJWTHelper();

      // Set up Mailers
      await this._setupMailers();

      // Install dependencies
      await this._bundleInstall();

      // Set up Guard
      await this._setupGuard();

      // Set up services
      await this._setupServices();

      // Remove master key
      await this._removeMasterKey();

      // Set up .env file
      await this._setUpEnv();

      // Set up config helper
      await this._setUpConfigHelper();

      // Update application config
      await this._updateApplicationConfig();

      // Generate GraphQL components
      await this._generateGraphQL(); 
      
      // Update application config
      await this._updateApplicationConfig();

      // Remove Active Record app config
      await this._removeActiveRecordAppConfig();

      // Set up Dockerfile
      await this._setupDockerfile();

      // Set up GitHub Actions
      await this._setupGithubActions();

      this._printSummary(projectPath, projectName);
    } catch (error) {
      this.log('Error during installation:', error.message);
      if (this.options.debug) {
        this.log('Stack trace:', error.stack);
      }
      process.exit(1);
    }
  }

  async _bundleInstall() {
    // make sure we are in the project directory
    process.chdir(this.destinationPath());

    // Install dependencies
    const { runBundleInstall } = await handlePrompt(this, [{
      type: 'confirm',
      name: 'runBundleInstall',
      message: 'Would you like to run bundle install now?',
      default: true
    }]);

    if (runBundleInstall) {
      this.log('Installing dependencies...');
      execSync('bundle install', { stdio: 'inherit' });
      this.log(`✓ Dependencies installed: ${this._fileLink('Gemfile.lock')}`);

      // bundle exec rails g devise:install
      execSync('bundle exec rails g devise:install --f', { stdio: 'inherit' });
      this.log(`✓ Devise installed: ${this._fileLink('config/initializers/devise.rb')}`);
    }
  }

  async _copyTemplateFile(templatePath, destinationPath, context = {}, options = { force: true }) {
    try {
      // Get the full template path
      const templateFullPath = this.templatePath(templatePath);
      const src = Array.isArray(templateFullPath) ? templateFullPath[0] : templateFullPath;
      
      // Get initial destination path
      let destinationFullPath = this.destinationPath(destinationPath);
      
      // Get the current working directory and project paths
      const cwd = process.cwd();
      const projectPath = path.join(cwd, this.answers.projectName);
      
      // Check if the path is outside the project directory AND doesn't already contain project name
      if (!destinationFullPath.startsWith(projectPath) && !destinationFullPath.includes(`/${this.answers.projectName}/`)) {
        // Remove any existing project name to prevent duplication
        const pathWithoutProject = destinationFullPath.replace(cwd, '').replace(/^\//, '');
        destinationFullPath = path.join(projectPath, pathWithoutProject);
      }
  
      // Check if file exists and handle overwrite
      if (fs.existsSync(destinationFullPath) && !options.force) {
        const { shouldOverwrite } = await handlePrompt(this, [{
          type: 'confirm',
          name: 'shouldOverwrite',
          message: `File ${destinationPath} already exists. Would you like to overwrite it?`,
          default: false
        }]);
  
        if (!shouldOverwrite) {
          this.log(`⏭️  Skipping ${destinationPath} (file already exists)`);
          return;
        }
      }
      
      // Ensure destination directory exists
      const destDir = path.dirname(destinationFullPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      
      // Delete the existing file if it exists to prevent merging
      if (fs.existsSync(destinationFullPath)) {
        fs.unlinkSync(destinationFullPath);
      }
      
      // Read the template content
      let content = fs.readFileSync(src, 'utf8');
      
      // Special handling for mongoid.yml database names
      if (templatePath.includes('mongoid.yml')) {
        content = content
          .replace(/rapid_stack_dev/g, `${this.answers.projectName}_development`)
          .replace(/rapid_stack_test/g, `${this.answers.projectName}_test`);
      } else {
        // Process ERB-style template variables for other files
        Object.entries(context).forEach(([key, value]) => {
          // Handle different ERB patterns
          const patterns = [
            // Standard ERB pattern
            new RegExp(`<%=\\s*${key}\\s*%>`, 'g'),
            // ERB with method calls (e.g., <%= projectName.camelize %>)
            new RegExp(`<%=\\s*${key}\\.\\w+\\s*%>`, 'g'),
            // ERB with complex expressions (e.g., <%= railsVersion.split('.')[0..1].join('.') %>)
            new RegExp(`<%=\\s*${key}\\s*\\.[\\w\\[\\]\\(')\\.\\s]+%>`, 'g')
          ];

          patterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
              matches.forEach(match => {
                // Extract any method calls or expressions
                const expressionMatch = match.match(/<%=\s*(\w+)(\.[\w\[\]\(\)\.\s]+)?\s*%>/);
                if (expressionMatch) {
                  const [, varName, expression] = expressionMatch;
                  if (expression) {
                    // Handle complex expressions
                    const expr = expression.replace(/^\s*\./, ''); // Remove leading dot
                    if (expr.includes('split') && expr.includes('join')) {
                      // Handle split and join operations
                      const parts = expr.split('.').map(p => p.trim());
                      if (parts[0] === 'split' && parts[2] === 'join') {
                        const splitChar = parts[1].match(/['"]([^'"]*)['"]/)?.[1] || '.';
                        const joinChar = parts[3].match(/['"]([^'"]*)['"]/)?.[1] || '.';
                        const arrayRange = parts[1].match(/\[(\d+\.\.\d+)\]/)?.[1];
                        if (arrayRange) {
                          const [start, end] = arrayRange.split('..').map(Number);
                          const result = value.split(splitChar).slice(start, end + 1).join(joinChar);
                          content = content.replace(match, result);
                        }
                      }
                    } else if (expr === 'camelize') {
                      // Handle camelize method
                      content = content.replace(match, this._camelize(value));
                    }
                  } else {
                    // Simple variable replacement
                    content = content.replace(match, value);
                  }
                }
              });
            }
          });
        });

        // Process any remaining ERB expressions that might have been missed
        content = content
          .replace(/<%= projectName\.camelize %>/g, this._camelize(this.answers.projectName))
          .replace(/<%= railsVersion\.split\('\.'\)\[0\.\.1\]\.join\('\.'\) %>/g, this.answers.railsVersion.split('.').slice(0, 2).join('.'));
      }
      
      // Write the processed content to the destination
      fs.writeFileSync(destinationFullPath, content, 'utf8');
      
      this.log(`✓ Created ${destinationPath}`);
      this.modifiedFiles.push(destinationPath);
    } catch (error) {
      this.log(`Error copying template ${templatePath}: ${error.message}`);
      throw error;
    }
  }

  _printSummary(installPath, projectName) {
    const customFiles = [
      { path: 'Gemfile', description: 'Custom Gemfile with MongoDB, GraphQL, and testing gems' },
      { path: 'config/mongoid.yml', description: 'MongoDB configuration with environment-specific settings' },
      { path: 'config/initializers/cors.rb', description: 'CORS configuration with environment-specific origins' },
      { path: 'config/initializers/devise.rb', description: 'Devise authentication configuration' },
      { path: 'app/graphql', description: 'GraphQL API setup with base types and schema' },
      { path: 'config/routes.rb', description: 'Routes configuration with GraphQL and health endpoints' },
      { path: 'config/application.rb', description: 'Application configuration without Active Record' },
      { path: 'lib/config_helper.rb', description: 'Config helper for environment-specific configuration' },
      { path: '.env.sample', description: 'Sample environment variables file' },
      { path: '.rspec', description: 'RSpec configuration file' },
      { path: 'spec/rails_helper.rb', description: 'Rails-specific RSpec configuration' },
      { path: 'spec/spec_helper.rb', description: 'General RSpec configuration' }
    ];

    this.log('\n=== Installation Summary ===');
    this.log('\nProject Setup:');
    this.log(`✓ Created new Rails API application: ${projectName}`);
    this.log(`✓ Location: ${installPath}`);
    
    this.log('\nKey Features Installed:');
    this.log('✓ API-only Rails application');
    this.log('✓ MongoDB integration with Mongoid');
    this.log('✓ GraphQL API with base schema');
    this.log('✓ Devise authentication framework');
    this.log('✓ Testing framework (RSpec)');
    this.log('✓ Development tools (Rubocop, Guard)');
    this.log('✓ CORS configuration for cross-origin requests');
    this.log('✓ Routes configured for GraphQL and health endpoints');
    this.log('✓ Application configured for MongoDB (without Active Record)');
    this.log('✓ Environment variables setup (no master.key)');

    this.log('\nCustomized Files:');
    customFiles.forEach(file => {
      this.log(`✓ ${file.path}`);
      this.log(`  └─ ${file.description}`);
    });

    this.log('\nNext Steps:');
    this.log('1. cd into your project directory:');
    this.log(`   cd ${projectName}`);
    this.log('2. Create a .env.development.local file based on .env.sample');
    this.log('3. Ensure MongoDB is running on your system');
    this.log('4. Run `rails s` to start the server');
    
    this.log('\nAvailable Endpoints (after starting server):');
    this.log('• API: http://localhost:3000');
    this.log('• GraphiQL: http://localhost:3000/graphiql (in development)');
    this.log('• Health Check: http://localhost:3000/health');
    this.log('• Letter Opener: http://localhost:3000/letter_opener (in development)');
  }

  _debugLog(message) {
    if (this.options.debug) {
      this.log(`[DEBUG] ${message}`);
    }
  }

  // Helper method to convert project name to camelcase
  _camelize(str) {
    return str.split(/[-_]/).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join('');
  }

  // Helper method to create clickable file links
  _fileLink(filePath) {
    const fullPath = this.destinationPath(filePath);
    return `file://${fullPath}`;
  }
};