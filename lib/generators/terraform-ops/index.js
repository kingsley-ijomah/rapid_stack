'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('yaml');
const { getConfigField, validateRequiredFields, findProjectRoot } = require('../../lib/utils');
const BaseGenerator = require('../base');

module.exports = class extends BaseGenerator {
  constructor(args, opts) {
    super(args, opts);
  }

  async initializing() {
    // Check if devops directory exists
    const devopsDir = path.join(process.cwd(), 'devops');
    if (!fs.existsSync(devopsDir)) {
      this.log('\n' + '='.repeat(80));
      this.log('⚠️ DevOps directory not found!');
      this.log('='.repeat(80));
      this.log('\nRunning rapid build:devops to create the devops directory...\n');
      
      try {
        this.spawnCommandSync('rapid', ['build:devops', '--force', '--yes']);
        this.log('\n✓ DevOps directory created successfully!\n');
      } catch (error) {
        this.log('\n❌ Failed to create devops directory:');
        this.log(error.message);
        process.exit(1);
      }
    }

    // Get project name from .rapidrc
    const appName = findProjectRoot(process.cwd());
    if (!appName) {
      this.log('\n' + '='.repeat(80));
      this.log('❌ Could not find project name in .rapidrc!');
      this.log('='.repeat(80));
      this.log('\nPlease ensure your .rapidrc file contains a valid config.app_name field.');
      this.log('\n' + '='.repeat(80) + '\n');
      process.exit(1);
    }

    // Check if .rapid_stack directory exists
    const rapidStackDir = path.join(os.homedir(), '.rapid_stack');
    if (!fs.existsSync(rapidStackDir)) {
      this.log('\n' + '='.repeat(80));
      this.log('❌ Configuration Directory Not Found!');
      this.log('='.repeat(80));
      this.log('\n📝 Expected directory:');
      this.log(`   ${rapidStackDir}`);
      this.log('\nPlease run "rapid init" first to create a project configuration.');
      this.log('\n' + '='.repeat(80) + '\n');
      process.exit(1);
    }

    // Set the config path for later use
    this.configPath = path.join(rapidStackDir, `config.yml`);

    // Validate required fields
    validateRequiredFields();

    this.answers = {
      app_name: appName
    };
  }

  async prompting() {
    // Ask what operation to perform
    const operationAnswer = await this.prompt([
      {
        type: 'list',
        name: 'operation',
        message: `What would you like to do with ${this.answers.app_name}?`,
        choices: [
          {
            name: 'Setup infrastructure',
            value: 'setup'
          },
          {
            name: 'Teardown infrastructure',
            value: 'teardown'
          }
        ]
      }
    ]);

    if (operationAnswer.operation === 'setup') {
      // Run terraform_setup.sh with the project configuration file path
      const setupScript = this.templatePath('terraform_setup.sh');
      fs.chmodSync(setupScript, '755');
      this.spawnCommandSync('sh', ['-c', `${setupScript} --config ${this.configPath}`]);
    } else {
      // Ask if user wants to remove git repos
      const gitCleanupAnswer = await this.prompt([
        {
          type: 'confirm',
          name: 'removeGitRepos',
          message: 'Would you like to remove git repositories as well?',
          default: true
        }
      ]);

      if (gitCleanupAnswer.removeGitRepos) {
        const folders = ['devops', 'frontend', 'backend'];
        const { execSync } = require('child_process');
        const projectPath = process.cwd();
        
        // Get token from config using getConfigField
        const token = getConfigField('repo_access_token');
        if (!token) {
          this.log('⚠️ Warning: Repository access token not found in configuration file.');
          this.log('   Please add your GitHub token to the configuration file under config.repo_access_token');
          return;
        }
        
        for (const folder of folders) {
          const folderPath = path.join(projectPath, folder);
          if (fs.existsSync(folderPath)) {
            try {
              process.chdir(folderPath);
              
              // Check if it's a git repository
              try {
                execSync('git rev-parse --git-dir', { stdio: 'ignore' });
              } catch (error) {
                this.log(`⚠️ Warning: ${folder} is not a git repository`);
                process.chdir(projectPath);
                continue;
              }
              
              // Get remote URL
              let remoteUrl;
              try {
                remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
              } catch (error) {
                this.log(`⚠️ Warning: ${folder} has no remote repository configured`);
                process.chdir(projectPath);
                continue;
              }
              
              if (remoteUrl) {
                // Extract repository information
                const repoInfo = parseGitUrl(remoteUrl);
                
                if (repoInfo.service === 'github') {
                  await deleteGitHubRepo(repoInfo.owner, repoInfo.repo, token);
                } else if (repoInfo.service === 'gitlab') {
                  await deleteGitLabRepo(repoInfo.owner, repoInfo.repo, token);
                } else {
                  this.log(`⚠️ Warning: Unsupported git hosting service for ${folder}`);
                }
                
                this.log(`✓ Deleted remote repository for ${folder}`);
              }
              process.chdir(projectPath);
            } catch (error) {
              this.log(`⚠️ Warning: Could not delete remote repository for ${folder}: ${error.message}`);
              process.chdir(projectPath);
            }
          } else {
            this.log(`⚠️ Warning: ${folder} directory does not exist in ${projectPath}`);
          }
        }
      }

      // Run the terraform cleanup script
      const cleanupScript = this.templatePath('terraform_cleanup.sh');
      fs.chmodSync(cleanupScript, '755');
      this.spawnCommandSync('sh', ['-c', `${cleanupScript} --app ${this.answers.app_name}`]);
    }
  }
};

// Helper function to parse git URL
function parseGitUrl(url) {
  // Handle both SSH and HTTPS URLs
  const sshMatch = url.match(/git@(.*?):(.*?)\/(.*?)\.git/);
  const httpsMatch = url.match(/https:\/\/(.*?)\/(.*?)\/(.*?)\.git/);
  
  if (sshMatch) {
    const [_, domain, owner, repo] = sshMatch;
    return {
      service: domain.includes('github') ? 'github' : domain.includes('gitlab') ? 'gitlab' : 'unknown',
      owner,
      repo
    };
  } else if (httpsMatch) {
    const [_, domain, owner, repo] = httpsMatch;
    return {
      service: domain.includes('github') ? 'github' : domain.includes('gitlab') ? 'gitlab' : 'unknown',
      owner,
      repo
    };
  }
  
  return { service: 'unknown', owner: '', repo: '' };
}

// Function to delete GitHub repository
async function deleteGitHubRepo(owner, repo, token) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github+json'
    }
  });

  if (response.status === 404) {
    throw new Error('Repository not found');
  } else if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || 'Failed to delete repository');
  }
}

// Function to delete GitLab repository
async function deleteGitLabRepo(owner, repo, token) {
  const response = await fetch(`https://gitlab.com/api/v4/projects/${encodeURIComponent(`${owner}/${repo}`)}`, {
    method: 'DELETE',
    headers: {
      'PRIVATE-TOKEN': token
    }
  });

  if (response.status === 404) {
    throw new Error('Repository not found');
  } else if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || 'Failed to delete repository');
  }
} 