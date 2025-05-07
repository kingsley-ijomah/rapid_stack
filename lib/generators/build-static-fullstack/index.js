const Generator = require('yeoman-generator');
const { execSync } = require('child_process');
const { validateRequiredFields } = require('../../lib/utils');

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
  }

  async initializing() {
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