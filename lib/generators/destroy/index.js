'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const BaseGenerator = require('../base');
const { findProjectRoot, validateRequiredFields } = require('../../lib/utils');
const { execSync } = require('child_process');
const fetch = require('node-fetch');

module.exports = class extends BaseGenerator {
  constructor(args, opts) {
    super(args, opts);
    this.originalDir = process.cwd();
  }

  async initializing() {
    // Validate required fields first
    validateRequiredFields();
    
    // Check if we're in a valid Rapid Stack project
    const frontendDir = path.join(this.originalDir, 'frontend');
    const backendDir = path.join(this.originalDir, 'backend');
    const devopsDir = path.join(this.originalDir, 'devops');

    if (!fs.existsSync(frontendDir) && !fs.existsSync(backendDir) && !fs.existsSync(devopsDir)) {
      this.log('\n' + '='.repeat(80));
      this.log('❌ No Rapid Stack project found!');
      this.log('='.repeat(80));
      this.log('\nThis directory does not appear to be a Rapid Stack project.');
      this.log('Please run this command from the root of your Rapid Stack project.');
      this.log('\n' + '='.repeat(80) + '\n');
      process.exit(1);
    }

    // Get project name from .rapidrc using findProjectRoot
    this.appName = findProjectRoot(this.originalDir);
    if (!this.appName) {
      this.log('\n' + '='.repeat(80));
      this.log('❌ Could not find project name in .rapidrc!');
      this.log('='.repeat(80));
      this.log('\nPlease ensure your .rapidrc file contains a valid projectName field.');
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
  }

  async prompting() {
    this.log('\n' + '='.repeat(80));
    this.log('⚠️  DESTRUCTION WARNING');
    this.log('='.repeat(80));
    this.log('\nThe following resources will be DESTROYED:');
    this.log('\nCloud Resources:');
    this.log('  • Cloudflare DNS records and configurations');
    this.log('  • Digital Ocean droplet and associated resources');
    this.log('\nGitHub Resources:');
    this.log('  • All GitHub repositories associated with this project');
    this.log('\nLocal Resources:');
    this.log('  • Frontend directory and all its contents');
    this.log('  • Backend directory and all its contents');
    this.log('  • DevOps directory and all its contents');
    this.log('\n' + '='.repeat(80));

    const answers = await this.prompt([
      {
        type: 'confirm',
        name: 'confirmDestroy',
        message: 'Are you absolutely sure you want to proceed with destruction?',
        default: false
      }
    ]);

    if (!answers.confirmDestroy) {
      this.log('\nDestruction cancelled. No resources were destroyed.\n');
      process.exit(0);
    }
  }

  async _confirmStep(message, defaultAnswer = false) {
    const answers = await this.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: message,
        default: defaultAnswer
      }
    ]);
    return answers.confirm;
  }

  async _destroyInfrastructure() {
    this.log('\n' + '='.repeat(80));
    this.log('🌐 Infrastructure Destruction');
    this.log('='.repeat(80));
    this.log('\nThis will destroy all infrastructure resources in DigitalOcean:');
    this.log('  • Droplets (Manager and Worker nodes)');
    this.log('  • Floating IPs (Load balancer and node IPs)');
    this.log('  • SSH Keys (For server access)');
    this.log('  • Domain Records (DNS configurations)');
    this.log('  • SSL Certificates (Let\'s Encrypt certificates)');
    this.log('  • Load Balancer (HAProxy configuration)');
    this.log('  • Spaces Buckets (Object storage)');
    this.log('  • Ansible Configuration (Server setup files)');
    this.log('  • GitHub Secrets (Repository configurations)');
    this.log('  • Vault Secrets (Application secrets)');

    const proceed = await this._confirmStep('Do you want to destroy all infrastructure resources? [y/N]');
    if (!proceed) {
      this.log('\n⚠️  Skipping infrastructure destruction');
      return;
    }

    this.log('\n🚀 Running terraform destroy...');
    const devopsDir = path.join(this.originalDir, 'devops');
    const terraformProcess = spawn('terraform', ['destroy', '-auto-approve'], {
      cwd: path.join(devopsDir, 'terraform'),
      stdio: 'inherit',
      shell: true
    });

    return new Promise((resolve) => {
      terraformProcess.on('exit', (code) => {
        if (code === 0) {
          this.log('\n✅ Infrastructure destroyed successfully!');
          // Clear terraform.tfvars
          const tfvarsPath = path.join(devopsDir, 'terraform', 'terraform.tfvars');
          fs.writeFileSync(tfvarsPath, '# Terraform variables\n');
          this.log('🗑️  terraform.tfvars has been cleared');
        } else {
          this.log('\n❌ Failed to destroy infrastructure!');
        }
        resolve();
      });
    });
  }

  async _deleteGitHubRepos() {
    this.log('\n' + '='.repeat(80));
    this.log('🐙 GitHub Repository Cleanup');
    this.log('='.repeat(80));

    const proceed = await this._confirmStep('Do you want to delete all GitHub repositories? [y/N]');
    if (!proceed) {
      this.log('\n⚠️  Skipping GitHub repository deletion');
      return;
    }

    const folders = ['devops', 'frontend', 'backend'];
    const projectPath = process.cwd();
    
    for (const folder of folders) {
      const folderPath = path.join(projectPath, folder);
      this.log(`\nChecking ${folder} directory...`);
      
      if (!fs.existsSync(folderPath)) {
        this.log(`⚠️ Warning: ${folder} directory does not exist in ${projectPath}`);
        continue;
      }

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
          const repoInfo = this._parseGitUrl(remoteUrl);
          if (!repoInfo) {
            this.log(`⚠️ Warning: Could not parse remote URL for ${folder}`);
            process.chdir(projectPath);
            continue;
          }
          
          if (repoInfo.service === 'github') {
            await this._deleteGitHubRepo(repoInfo.owner, repoInfo.repo, token);
            this.log(`✓ Deleted remote repository for ${folder}`);
          } else if (repoInfo.service === 'gitlab') {
            await this._deleteGitLabRepo(repoInfo.owner, repoInfo.repo, token);
            this.log(`✓ Deleted remote repository for ${folder}`);
          } else {
            this.log(`⚠️ Warning: Unsupported git hosting service for ${folder}`);
          }
        }
        process.chdir(projectPath);
      } catch (error) {
        this.log(`⚠️ Warning: Could not delete remote repository for ${folder}: ${error.message}`);
        process.chdir(projectPath);
      }
    }
  }

  _parseGitUrl(url) {
    if (!url) return null;
    
    // Handle both SSH and HTTPS URLs
    const sshMatch = url.match(/git@(.*?):(.*?)\/(.*?)\.git/);
    const httpsMatch = url.match(/https:\/\/(.*?)\/(.*?)\/(.*?)\.git/);
    
    if (sshMatch) {
      const [_, domain, owner, repo] = sshMatch;
      return {
        service: domain.includes('github') ? 'github' : 'gitlab',
        owner,
        repo
      };
    } else if (httpsMatch) {
      const [_, domain, owner, repo] = httpsMatch;
      return {
        service: domain.includes('github') ? 'github' : 'gitlab',
        owner,
        repo
      };
    }
    return null;
  }

  async _deleteGitHubRepo(owner, repo, token) {
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete repository: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Failed to delete GitHub repository: ${error.message}`);
    }
  }

  async _deleteGitLabRepo(owner, repo, token) {
    try {
      const response = await fetch(`https://gitlab.com/api/v4/projects/${owner}%2F${repo}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete repository: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Failed to delete GitLab repository: ${error.message}`);
    }
  }

  async _deleteLocalDirectories() {
    this.log('\n' + '='.repeat(80));
    this.log('💻 Local Directory Cleanup');
    this.log('='.repeat(80));

    const proceed = await this._confirmStep('Do you want to delete all local directories? [y/N]');
    if (!proceed) {
      this.log('\n⚠️  Skipping local directory deletion');
      return;
    }

    const folders = ['devops', 'frontend', 'backend'];
    const projectPath = process.cwd();
    
    for (const folder of folders) {
      const folderPath = path.join(projectPath, folder);
      this.log(`\nChecking ${folder} directory...`);
      
      if (!fs.existsSync(folderPath)) {
        this.log(`⚠️ Warning: ${folder} directory does not exist in ${projectPath}`);
        continue;
      }

      try {
        // First, try to remove the directory directly
        try {
          fs.rmSync(folderPath, { recursive: true, force: true });
          this.log(`✓ Deleted ${folder} directory`);
          continue;
        } catch (error) {
          this.log(`⚠️ First attempt to delete ${folder} failed: ${error.message}`);
        }

        // If direct removal fails, try to remove contents first
        try {
          const files = fs.readdirSync(folderPath);
          for (const file of files) {
            const filePath = path.join(folderPath, file);
            const stats = fs.statSync(filePath);
            
            if (stats.isDirectory()) {
              fs.rmSync(filePath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(filePath);
            }
          }
          
          // Now try to remove the directory itself
          fs.rmdirSync(folderPath);
          this.log(`✓ Deleted ${folder} directory`);
        } catch (error) {
          this.log(`⚠️ Could not delete ${folder} directory: ${error.message}`);
          this.log(`   Directory path: ${folderPath}`);
        }
      } catch (error) {
        this.log(`⚠️ Error processing ${folder} directory: ${error.message}`);
      }
    }

    // Verify deletion
    const remainingDirs = folders.filter(folder => 
      fs.existsSync(path.join(projectPath, folder))
    );

    if (remainingDirs.length > 0) {
      this.log('\n⚠️  The following directories could not be deleted:');
      remainingDirs.forEach(dir => this.log(`  • ${dir}`));
    } else {
      this.log('\n✓ All project directories have been deleted');
    }
  }

  async install() {
    try {
      // Step 1: Destroy Infrastructure
      await this._destroyInfrastructure();

      // Step 2: Delete GitHub Repositories
      await this._deleteGitHubRepos();

      // Step 3: Delete Local Directories
      await this._deleteLocalDirectories();

      this.log('\n' + '='.repeat(80));
      this.log('✅ Destruction process completed');
      this.log('='.repeat(80) + '\n');
    } catch (error) {
      this.log('\n❌ Error during destruction process:');
      this.log(error.message);
      process.exit(1);
    }
  }
}; 