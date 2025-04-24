'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('yaml');
const { getConfigField, validateRequiredFields } = require('../../lib/utils');
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
    const appName = getConfigField('config.app_name');
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
    validateRequiredFields([
      'config.cloudflare_api_key',
      'config.cloudflare_account_id',
      'config.github_username',
      'config.repo_access_token',
      'config.dockerhub_username',
      'config.dockerhub_password',
      'config.email'
    ]);

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
      // Run terraform_setup.sh with both configuration file paths
      const setupScript = this.templatePath('terraform_setup.sh');
      fs.chmodSync(setupScript, '755');
      this.spawnCommandSync('sh', ['-c', `${setupScript} --global-config ${this.configPath} --project-config .rapidrc`]);
    } else {
      // Run the terraform cleanup script
      const cleanupScript = this.templatePath('terraform_cleanup.sh');
      fs.chmodSync(cleanupScript, '755');
      this.spawnCommandSync('sh', ['-c', `${cleanupScript} --app ${this.answers.app_name}`]);
    }
  }
}; 