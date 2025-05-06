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
        'config.dockerhub_username',
        'config.dockerhub_password',
        'config.email'
      ]
    );
    if (this.options.rm) {
      await this._handleDeletion();
      process.exit(0);
    }
  }

  // Cleanup local Git repository
  async _cleanupLocalGit(deployment, originalDir) {
    const deploymentDir = path.join(originalDir, deployment);
    if (!fs.existsSync(deploymentDir)) {
      this.log(`⚠️ ${deployment} directory not found at ${deploymentDir}`);
      return;
    }

    try {
      process.chdir(deploymentDir);
      this.log(`\nCleaning up Git configuration in ${deployment} directory...`);

      // Check if it's a Git repository
      const { execSync } = require('child_process');
      try {
        execSync('git rev-parse --git-dir', { stdio: 'ignore' });
        
        // Remove remote
        try {
          execSync('git remote remove origin', { stdio: 'ignore' });
          this.log(`✓ Removed origin remote from ${deployment}`);
        } catch (error) {
          this.log(`⚠️ No origin remote found in ${deployment}`);
        }

        // Remove .git directory
        const gitDir = path.join(deploymentDir, '.git');
        if (fs.existsSync(gitDir)) {
          fs.rmSync(gitDir, { recursive: true, force: true });
          this.log(`✓ Removed .git directory from ${deployment}`);
        }

      } catch (error) {
        this.log(`⚠️ ${deployment} is not a Git repository`);
      }
    } catch (error) {
      this.log(`❌ Error cleaning up ${deployment}:`, error.message);
    } finally {
      // Always return to original directory
      process.chdir(originalDir);
    }
  }

  async _handleDeletion() {
    const pendingDeployments = this._scanForDeployments();
    
    if (pendingDeployments.length === 0) {
      this.log('No deployments found to delete.');
      return;
    }

    this.log('\nFound the following deployments:');
    pendingDeployments.forEach(deployment => {
      this.log(`- ${deployment}`);
    });

    const { confirmDelete } = await handlePrompt(this, [{
      type: 'confirm',
      name: 'confirmDelete',
      message: 'Do you want to delete these repositories?',
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

      // Create repository names
      const repoNames = pendingDeployments.map(deployment => `${appName}-${deployment}`).join(',');

      // Delete repositories
      await deleteGitHubRepos(githubUsername, repoAccessToken, repoNames);
      this.log('✓ Remote repositories deleted successfully');

      // Store original directory
      const originalDir = process.cwd();

      // Clean up local Git configuration for each deployment
      for (const deployment of pendingDeployments) {
        await this._cleanupLocalGit(deployment, originalDir);
      }

      this.log('\n✓ Cleanup completed');
    } catch (error) {
      this.log('❌ Error during deletion process:', error.message);
      process.exit(1);
    }
  }

  _scanForDeployments() {
    const currentDir = process.cwd();
    const pendingDeployments = [];

    // Check for backend directory
    if (fs.existsSync(path.join(currentDir, 'backend'))) {
      pendingDeployments.push('backend');
    }

    // Check for frontend directory
    if (fs.existsSync(path.join(currentDir, 'frontend'))) {
      pendingDeployments.push('frontend');
    }

    // Check for devops directory
    if (fs.existsSync(path.join(currentDir, 'devops'))) {
      pendingDeployments.push('devops');
    }

    return pendingDeployments;
  }

  _displayDeployments(pendingDeployments) {
    if (pendingDeployments.length > 0) {
      this.log('\nPending deployments found:');
      pendingDeployments.forEach(deployment => {
        this.log(`- ${deployment}`);
      });
    } else {
      this.log('\nNo pending deployments found.');
    }
  }

  _generateRandomPassword(length = 32) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  _generateSecureKey(length = 64) {
    try {
      return require('child_process').execSync(`openssl rand -hex ${length}`).toString().trim();
    } catch (error) {
      this.log('❌ Error generating secure key:', error.message);
      process.exit(1);
    }
  }

  _generateSSHKey() {
    try {
      const { execSync } = require('child_process');
      const sshDir = path.join(process.env.HOME, '.ssh');
      const keyName = `rapid_stack_${Date.now()}`;
      const privateKeyPath = path.join(sshDir, keyName);
      const publicKeyPath = `${privateKeyPath}.pub`;

      // Create .ssh directory if it doesn't exist
      if (!fs.existsSync(sshDir)) {
        fs.mkdirSync(sshDir, { mode: 0o700 });
      }

      // Generate SSH key pair
      execSync(`ssh-keygen -t ed25519 -f ${privateKeyPath} -N ""`, { stdio: 'inherit' });
      
      // Set proper permissions
      fs.chmodSync(privateKeyPath, 0o600);
      fs.chmodSync(publicKeyPath, 0o644);

      this.log(`✓ Generated new SSH key pair: ${keyName}`);
      return keyName;
    } catch (error) {
      this.log('❌ Error generating SSH key:', error.message);
      process.exit(1);
    }
  }

  async _createGitHubSecrets(githubUsername, repoName, repoAccessToken, appName, deploymentType) {
    try {
      // Get additional config values
      const dockerhubUsername = getConfigField('config.dockerhub_username');
      const dockerhubPassword = getConfigField('config.dockerhub_password');
      const remoteMachine = getConfigField('config.remote_machine');
      const appSupportEmail = getConfigField('config.app_support_email');
      const mailerFromName = getConfigField('config.mailer_from_name');
      const mailerFromAddress = getConfigField('config.mailer_from_address');
      const postmarkApiKey = getConfigField('config.postmark_api_key');
      const cloudflareApiKey = getConfigField('config.cloudflare_api_key');
      const cloudflareAccountId = getConfigField('config.cloudflare_account_id');
      const appName = getConfigField('config.app_name');

      // Generate MongoDB secrets for backend
      const mongodbDatabase = `${appName}_prod`;
      const mongodbUser = `${appName}_user`;
      const mongodbPassword = this._generateRandomPassword();

      // Generate secure keys
      const jwtSecretKey = this._generateSecureKey(64);
      const secretKeyBase = this._generateSecureKey(64);
      const railsMasterKey = this._generateSecureKey(16);

      // Get or generate SSH key
      const sshDir = path.join(process.env.HOME, '.ssh');
      let matchingKey = null;
      
      if (fs.existsSync(sshDir)) {
        const sshFiles = fs.readdirSync(sshDir);
        matchingKey = sshFiles.find(file => file.startsWith('rapid_stack_'));
      }

      if (!matchingKey) {
        this.log('No existing SSH key found, generating a new one...');
        matchingKey = this._generateSSHKey();
      }

      const sshKeyContent = fs.readFileSync(path.join(sshDir, matchingKey), 'utf8');
      
      // Set up GitHub secrets
      const secrets = [];

      // Add MongoDB secrets only for backend
      if (deploymentType === 'backend') {
        secrets.push(
          { key: 'MONGODB_DATABASE', value: mongodbDatabase },
          { key: 'MONGODB_USER', value: mongodbUser },
          { key: 'MONGODB_PASSWORD', value: mongodbPassword },
          { key: 'MY_GITHUB_USERNAME', value: githubUsername },
          { key: 'APP_NAME', value: appName },
          { key: 'REPO_ACCESS_TOKEN', value: repoAccessToken },
          { key: 'DOCKERHUB_USERNAME', value: dockerhubUsername },
          { key: 'DOCKERHUB_PASSWORD', value: dockerhubPassword },
          { key: 'REMOTE_MACHINE', value: remoteMachine },
          { key: 'SSH_PRIVATE_KEY', value: sshKeyContent },
          { key: 'JWT_SECRET_KEY', value: jwtSecretKey },
          { key: 'SECRET_KEY_BASE', value: secretKeyBase },
          { key: 'RAILS_MASTER_KEY', value: railsMasterKey },
          { key: 'APP_SUPPORT_EMAIL', value: appSupportEmail },
          { key: 'MAILER_FROM_NAME', value: mailerFromName },
          { key: 'MAILER_FROM_ADDRESS', value: mailerFromAddress },
          { key: 'POSTMARK_API_KEY', value: postmarkApiKey }
        );
      }

      if (deploymentType === 'frontend') {
        secrets.push(
          { key: 'CLOUDFLARE_API_TOKEN', value: cloudflareApiKey },
          { key: 'CLOUDFLARE_ACCOUNT_ID', value: cloudflareAccountId },
          { key: 'APP_NAME', value: appName }
        );
      }

      if (deploymentType === 'devops') {
        secrets.push(
          { key: 'APP_NAME', value: appName }
        );
      }

      // Use the improved updateGitHubSecrets function
      await updateGitHubSecrets(githubUsername, repoName, repoAccessToken, secrets);
    } catch (error) {
      this.log('❌ Error creating GitHub secrets:', error.message);
      process.exit(1);
    }
  }

  async _setupGitHubRepository(deploymentType) {
    try {
      // Get GitHub credentials from config
      const githubUsername = getConfigField('config.github_username');
      const appName = getConfigField('config.app_name');
      const repoAccessToken = getConfigField('config.repo_access_token');

      // Ask user if they want to create the repository
      const { createRepo } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'createRepo',
        message: `Would you like to create the ${appName}-${deploymentType} repository?`,
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
          const repoName = `${appName}-${deploymentType}`;
          
          // Create GitHub repository
          await createGitHubRepos(
            githubUsername,
            repoAccessToken,
            repoName,
            !isPrivate // invert isPrivate since createGitHubRepos expects isPublic
          );

          // Create GitHub secrets before pushing
          await this._createGitHubSecrets(githubUsername, repoName, repoAccessToken, appName, deploymentType);

          // Set up GitHub Actions workflow before initializing Git
          await this._setupGitHubActions(deploymentType);

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

  async _setupGitHubActions(deploymentType) {
    // Skip GitHub Actions setup for devops
    if (deploymentType === 'devops') {
      return;
    }

    const workflowDir = path.join(process.cwd(), '.github', 'workflows');
    const workflowPath = path.join(workflowDir, 'ci.yml');

    // Create .github/workflows directory if it doesn't exist
    if (!fs.existsSync(workflowDir)) {
      fs.mkdirSync(workflowDir, { recursive: true });
    }

    // Check if workflow file exists
    if (fs.existsSync(workflowPath)) {
      const { confirmOverwrite } = await handlePrompt(this, [{
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'GitHub Actions workflow file already exists. Do you want to overwrite it?',
        default: false
      }]);

      if (!confirmOverwrite) {
        this.log('Skipping GitHub Actions workflow setup.');
        return;
      }
    }

    // Copy the appropriate workflow file based on deployment type
    const templatePath = `github/workflows/${deploymentType}/ci.yml.erb`;

    // Copy the template file
    this.fs.copy(
      this.templatePath(templatePath),
      workflowPath
    );

    // Force write to disk immediately
    await new Promise((resolve, reject) => {
      this.fs.commit((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    this.log(`✓ Added GitHub Actions workflow for ${deploymentType}`);
  }

  async install() {
    const pendingDeployments = this._scanForDeployments();
    this._displayDeployments(pendingDeployments);

    // Store the original working directory
    const originalDir = process.cwd();

    // Create GitHub repositories for each deployment
    for (const deployment of pendingDeployments) {
      // Change to the deployment directory
      const deploymentDir = path.join(originalDir, deployment);
      if (!fs.existsSync(deploymentDir)) {
        this.log(`❌ ${deployment} directory not found at ${deploymentDir}`);
        process.exit(1);
      }
      process.chdir(deploymentDir);
      this.log(`Changed to ${deployment} directory: ${deploymentDir}`);

      await this._setupGitHubRepository(deployment);

      // Change back to the original directory
      process.chdir(originalDir);
    }
  }
}; 