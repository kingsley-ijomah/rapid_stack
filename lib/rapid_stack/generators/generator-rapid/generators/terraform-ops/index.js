'use strict';
const Generator = require('yeoman-generator');
const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('yaml');
const { validateProjectConfig } = require('../../lib/utils');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
  }

  async initializing() {
    // Check if .rapid_stack directory exists
    const rapidStackDir = path.join(os.homedir(), '.rapid_stack');
    const configExists = fs.existsSync(rapidStackDir);

    if (!configExists) {
      console.clear();
      console.log('\n' + '='.repeat(80));
      console.log('❌ Configuration Directory Not Found!');
      console.log('='.repeat(80));
      console.log('\n📝 Expected directory:');
      console.log(`   ${rapidStackDir}`);
      console.log('\nPlease run "rapid init" first to create a project configuration.');
      console.log('\n' + '='.repeat(80) + '\n');
      process.exit(1);
    }

    // Get list of existing project config files
    const configFiles = fs.readdirSync(rapidStackDir)
      .filter(file => file.endsWith('_project.yml'))
      .map(file => file.replace('_project.yml', ''));

    if (configFiles.length === 0) {
      console.clear();
      console.log('\n' + '='.repeat(80));
      console.log('❌ No Project Configurations Found!');
      console.log('='.repeat(80));
      console.log('\nPlease run "rapid init" first to create a project configuration.');
      console.log('\n' + '='.repeat(80) + '\n');
      process.exit(1);
    }

    // Ask user to choose a project configuration
    const configAnswer = await this.prompt([
      {
        type: 'list',
        name: 'configChoice',
        message: 'Choose a project configuration:',
        choices: configFiles.map(file => ({
          name: file,
          value: file
        }))
      }
    ]);

    // Validate the selected configuration
    this.projectConfig = validateProjectConfig(configAnswer.configChoice);
    this.configPath = path.join(rapidStackDir, `${configAnswer.configChoice}_project.yml`);
    this.answers = {
      app_name: configAnswer.configChoice
    };

    // Check for required project folders
    const requiredFolders = [
      { name: 'frontend', command: 'build-frontend' },
      { name: 'backend', command: 'build-backend' },
      { name: 'devops', command: 'build-devops' },
      { name: 'nginx', command: 'build-nginx' }
    ];

    const missingFolders = requiredFolders.filter(folder => 
      !fs.existsSync(path.join(process.cwd(), folder.name))
    );

    if (missingFolders.length > 0) {
      console.clear();
      console.log('\n' + '='.repeat(80));
      console.log('❌ Missing Required Project Folders!');
      console.log('='.repeat(80));
      
      console.log('\n📝 Missing Folders:');
      missingFolders.forEach(folder => {
        console.log(`   - ${folder.name}`);
      });

      console.log('\n📋 Next Steps:');
      console.log('Please build the missing components in this order:');
      missingFolders.forEach(folder => {
        console.log(`1. yo rapid:${folder.command}`);
      });
      
      console.log('\nAfter building all components, run this command again:');
      console.log('yo rapid:terraform-ops');
      
      console.log('\n' + '='.repeat(80) + '\n');
      process.exit(1);
    }
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
      // Run the terraform cleanup script
      const cleanupScript = this.templatePath('terraform_cleanup.sh');
      fs.chmodSync(cleanupScript, '755');
      this.spawnCommandSync('sh', ['-c', `${cleanupScript} --app ${this.answers.app_name}`]);
    }
  }
}; 