const BaseGenerator = require('../base');
const fs = require('fs');
const path = require('path');
const { 
  handlePrompt, 
  getConfigField, 
  createGitHubRepos, 
  validateRequiredFields, 
  initializeAndPushGitRepo, 
  updateGitHubSecrets, 
  deleteGitHubRepos 
} = require('../../lib/utils');

module.exports = class extends BaseGenerator {
  static DEPLOYMENT_NAME = 'static-web';

  constructor(args, opts) {
    super(args, opts);
  }

  async initializing() {
    validateRequiredFields(
      [
        'config.cloudflare_api_key',
        'config.cloudflare_account_id',
        'config.github_username',
        'config.repo_access_token',
        'config.app_name'
      ]
    );
    if (this.options.rm) {
      await this._handleDeletion();
      process.exit(0);
    }
  }

  // Cleanup local Git repository
  async _cleanupLocalGit(originalDir) {
    const staticWebDir = path.join(originalDir, this.constructor.DEPLOYMENT_NAME);
    if (!fs.existsSync(staticWebDir)) {
      this.log(`⚠️ ${this.constructor.DEPLOYMENT_NAME} directory not found at ${staticWebDir}`);
      return;
    }

    try {
      process.chdir(staticWebDir);
      this.log(`\nCleaning up Git configuration in ${this.constructor.DEPLOYMENT_NAME} directory...`);

      // Check if it's a Git repository
      const { execSync } = require('child_process');
      try {
        execSync('git rev-parse --git-dir', { stdio: 'ignore' });
        
        // Remove remote
        try {
          execSync('git remote remove origin', { stdio: 'ignore' });
          this.log(`✓ Removed origin remote from ${this.constructor.DEPLOYMENT_NAME}`);
        } catch (error) {
          this.log(`⚠️ No origin remote found in ${this.constructor.DEPLOYMENT_NAME}`);
        }

        // Remove .git directory
        const gitDir = path.join(staticWebDir, '.git');
        if (fs.existsSync(gitDir)) {
          fs.rmSync(gitDir, { recursive: true, force: true });
          this.log(`✓ Removed .git directory from ${this.constructor.DEPLOYMENT_NAME}`);
        }

      } catch (error) {
        this.log(`⚠️ ${this.constructor.DEPLOYMENT_NAME} is not a Git repository`);
      }
    } catch (error) {
      this.log(`❌ Error cleaning up ${this.constructor.DEPLOYMENT_NAME}:`, error.message);
    } finally {
      // Always return to original directory
      process.chdir(originalDir);
    }
  }

  async _handleDeletion() {
    const staticWebDir = path.join(process.cwd(), this.constructor.DEPLOYMENT_NAME);
    
    if (!fs.existsSync(staticWebDir)) {
      this.log(`No ${this.constructor.DEPLOYMENT_NAME} directory found to delete.`);
      return;
    }

    this.log(`\nFound ${this.constructor.DEPLOYMENT_NAME} deployment:`);
    this.log(`- ${this.constructor.DEPLOYMENT_NAME}`);

    const { confirmDelete } = await handlePrompt(this, [{
      type: 'confirm',
      name: 'confirmDelete',
      message: `Do you want to delete the ${this.constructor.DEPLOYMENT_NAME} repository?`,
      default: false
    }]);

    if (!confirmDelete) {
      this.log('Repository deletion cancelled.');
      return;
    }

    try {
      const githubUsername = getConfigField('config.github_username');
      const repoAccessToken = getConfigField('config.repo_access_token');
      const appName = getConfigField('config.app_name');

      // Create repository name
      const repoName = `${appName}-${this.constructor.DEPLOYMENT_NAME}`;

      // Delete repository
      await deleteGitHubRepos(githubUsername, repoAccessToken, repoName);
      this.log('✓ Remote repository deleted successfully');

      // Store original directory
      const originalDir = process.cwd();

      // Clean up local Git configuration
      await this._cleanupLocalGit(originalDir);

      this.log('\n✓ Cleanup completed');
    } catch (error) {
      this.log('❌ Error during deletion process:', error.message);
      process.exit(1);
    }
  }

  _scanForDeployments() {
    const currentDir = process.cwd();
    const pendingDeployments = [];

    // Check for static-web directory
    if (fs.existsSync(path.join(currentDir, this.constructor.DEPLOYMENT_NAME))) {
      pendingDeployments.push(this.constructor.DEPLOYMENT_NAME);
    }

    return pendingDeployments;
  }

  _displayDeployments(pendingDeployments) {
    if (pendingDeployments.length > 0) {
      this.log(`\nFound ${this.constructor.DEPLOYMENT_NAME} deployment:`);
      pendingDeployments.forEach(deployment => {
        this.log(`- ${deployment}`);
      });
    } else {
      this.log(`\nNo ${this.constructor.DEPLOYMENT_NAME} directory found.`);
    }
  }

  async _createGitHubSecrets(githubUsername, repoName, repoAccessToken) {
    try {
      // Get config values
      const cloudflareApiKey = getConfigField('config.cloudflare_api_key');
      const cloudflareAccountId = getConfigField('config.cloudflare_account_id');
      const appName = getConfigField('config.app_name');

      // Set up GitHub secrets
      const secrets = [
        { key: 'CLOUDFLARE_API_TOKEN', value: cloudflareApiKey },
        { key: 'CLOUDFLARE_ACCOUNT_ID', value: cloudflareAccountId },
        { key: 'APP_NAME', value: appName }
      ];

      // Use the improved updateGitHubSecrets function
      await updateGitHubSecrets(githubUsername, repoName, repoAccessToken, secrets);
    } catch (error) {
      this.log('❌ Error creating GitHub secrets:', error.message);
      process.exit(1);
    }
  }

  async _setupGitHubRepository() {
    try {
      // Get GitHub credentials from config
      const githubUsername = getConfigField('config.github_username');
      const appName = getConfigField('config.app_name');
      const repoAccessToken = getConfigField('config.repo_access_token');

      // Ask user if they want to create the repository
      const { createRepo } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'createRepo',
        message: `Would you like to create the ${appName}-${this.constructor.DEPLOYMENT_NAME} repository?`,
        default: true
      }]);

      if (createRepo) {
        // Ask if repository should be private
        const { isPrivate } = await handlePrompt(this, [{
          type: 'confirm',
          name: 'isPrivate',
          message: 'Should the repository be private?',
          default: true
        }]);

        try {
          const repoName = `${appName}-${this.constructor.DEPLOYMENT_NAME}`;
          
          // Create GitHub repository
          await createGitHubRepos(
            githubUsername,
            repoAccessToken,
            repoName,
            !isPrivate // invert isPrivate since createGitHubRepos expects isPublic
          );

          // Create GitHub secrets before pushing
          await this._createGitHubSecrets(githubUsername, repoName, repoAccessToken);

          // Initialize Git repository and push initial commit
          this.log('Initializing Git repository and pushing initial commit...');
          await initializeAndPushGitRepo(githubUsername, repoName);
          this.log('✓ Initial commit pushed to GitHub');
        } catch (error) {
          this.log('❌ Error creating GitHub repository:', error.message);
          this.log('Please check your GitHub credentials and permissions.');
          process.exit(1);
        }
      } else {
        this.log('⚠️  Skipping GitHub repository creation');
      }
    } catch (error) {
      this.log('❌ Error accessing config file:', error.message);
      this.log('Please ensure your .rapidrc file is properly configured.');
      process.exit(1);
    }
  }

  async install() {
    const pendingDeployments = this._scanForDeployments();
    this._displayDeployments(pendingDeployments);

    if (pendingDeployments.length === 0) {
      this.log(`❌ No ${this.constructor.DEPLOYMENT_NAME} directory found. Please create it first.`);
      process.exit(1);
    }

    // Store the original working directory
    const originalDir = process.cwd();

    // Change to the static-web directory
    const staticWebDir = path.join(originalDir, this.constructor.DEPLOYMENT_NAME);
    process.chdir(staticWebDir);
    this.log(`Changed to ${this.constructor.DEPLOYMENT_NAME} directory: ${staticWebDir}`);

    await this._setupGitHubRepository();

    // Change back to the original directory
    process.chdir(originalDir);
  }
}; 