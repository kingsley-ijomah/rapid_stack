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
    // Check if --rm flag is present
    if (this.options.rm) {
      const appName = getConfigField('config.app_name');
      if (!appName) {
        this.log('\n' + '='.repeat(80));
        this.log('❌ Could not find project name in .rapidrc!');
        this.log('='.repeat(80));
        this.log('\nPlease ensure your .rapidrc file contains a valid config.app_name field.');
        this.log('\n' + '='.repeat(80) + '\n');
        process.exit(1);
      }

      // Run the terraform cleanup script
      const cleanupScript = this.templatePath('terraform_cleanup.sh');
      fs.chmodSync(cleanupScript, '755');
      this.spawnCommandSync('sh', ['-c', `${cleanupScript} --app ${appName}`]);
      process.exit(0);
    }

    // Check if devops directory exists
    const devopsDir = path.join(process.cwd(), 'static-devops');
    if (!fs.existsSync(devopsDir)) {
      this.log('\n' + '='.repeat(80));
      this.log('⚠️ Static DevOps directory not found!');
      this.log('='.repeat(80));
      this.log('\nRunning rapid build:static-devops to create the devops directory...\n');
      
      try {
        this.spawnCommandSync('rapid', ['build:static-devops', '--force', '--yes']);
        this.log('\n✓ Static DevOps directory created successfully!\n');
      } catch (error) {
        this.log('\n❌ Failed to create static devops directory:');
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
    ]);

    this.answers = {
      app_name: appName
    };
  }

  async prompting() {
    // Run terraform_setup.sh with both configuration file paths
    const setupScript = this.templatePath('terraform_setup.sh');
    fs.chmodSync(setupScript, '755');
    this.spawnCommandSync('sh', ['-c', `${setupScript} --global-config ${this.configPath} --project-config .rapidrc`]);
  }
}; 