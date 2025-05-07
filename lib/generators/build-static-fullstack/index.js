const Generator = require('yeoman-generator');
const { execSync } = require('child_process');
const { validateRequiredFields } = require('../../lib/utils');
const path = require('path');
const fs = require('fs');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
    this.option('yes', {
      type: Boolean,
      default: false,
      description: 'Automatically answer yes to prompts'
    });
    this.option('force', {
      type: Boolean,
      default: false,
      description: 'Force overwrite existing files'
    });
    this.option('rm', {
      type: Boolean,
      default: false,
      description: 'Remove all static fullstack resources'
    });
  }

  async initializing() {
    // Check if --rm flag is present
    if (this.options.rm) {
      try {
        this.log('Starting static fullstack removal process...');
        
        this.log('Removing static devops resources...');
        execSync('rapid run:static-devops --rm', { stdio: 'inherit' });

        this.log('Removing static deploy resources...');
        execSync('rapid run:static-deploy --rm', { stdio: 'inherit' });

        this.log('Removing static web resources...');
        execSync('rapid build:static --rm', { stdio: 'inherit' });

        // Ask for confirmation before removing static-devops directory
        const { confirmRemove } = await this.prompt([
          {
            type: 'confirm',
            name: 'confirmRemove',
            message: 'Do you want to remove the static-devops directory?',
            default: false
          }
        ]);

        if (confirmRemove) {
          // Remove static-devops directory
          const staticDevopsDir = path.join(process.cwd(), 'static-devops');
          if (fs.existsSync(staticDevopsDir)) {
            fs.rmSync(staticDevopsDir, { recursive: true, force: true });
            this.log('✓ Removed static-devops directory');
          } else {
            this.log('static-devops directory not found.');
          }
        } else {
          this.log('Skipping static-devops directory removal.');
        }

        this.log('Static fullstack removal completed successfully!');
        process.exit(0);
      } catch (error) {
        this.log.error('Error during static fullstack removal:', error.message);
        process.exit(1);
      }
    }

    this.log('Starting static fullstack build process...');
    
    // Validate required fields
    validateRequiredFields([
      'config.cloudflare_api_key',
      'config.cloudflare_account_id',
      'config.github_username',
      'config.repo_access_token'
    ]);
  }

  async prompting() {
    // No prompts needed as we're using --yes flag
  }

  async writing() {
    // No file writing needed
  }

  async install() {
    try {
      // Run commands in sequence
      this.log('Building static assets...');
      execSync('rapid build:static --yes --force', { stdio: 'inherit' });

      this.log('Building static devops...');
      execSync('rapid build:static-devops --yes --force', { stdio: 'inherit' });

      this.log('Running static devops...');
      execSync('rapid run:static-devops --yes --force', { stdio: 'inherit' });

      this.log('Running static deploy...');
      execSync('rapid run:static-deploy --yes --force', { stdio: 'inherit' });

      this.log('Static fullstack build completed successfully!');
    } catch (error) {
      this.log.error('Error during static fullstack build:', error.message);
      throw error;
    }
  }

  async end() {
    this.log('Static fullstack build process finished.');
  }
}; 