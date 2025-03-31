'use strict';
const Generator = require('yeoman-generator');
const chalk = require('chalk');
const path = require('path');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
  }

  async prompting() {
    this.answers = await this.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          {
            name: '🚀 Build and start development environment',
            value: 'build'
          },
          {
            name: '🛑 Tear down development environment',
            value: 'teardown'
          }
        ]
      },
      {
        type: 'confirm',
        name: 'cleanVolumes',
        message: 'Would you like to clean up all volumes?',
        default: false,
        when: (answers) => answers.action === 'teardown'
      }
    ]);
  }

  end() {
    const startScript = this.templatePath('dev-start.sh');
    const stopScript = this.templatePath('dev-stop.sh');

    // Execute the chosen action
    if (this.answers.action === 'build') {
      this.log(chalk.blue('🚀 Starting development environment...'));
      this.spawnCommandSync('bash', [startScript]);
    } else if (this.answers.action === 'teardown') {
      this.log(chalk.yellow('🛑 Tearing down development environment...'));
      if (this.answers.cleanVolumes) {
        this.spawnCommandSync('bash', [stopScript, '--clean']);
      } else {
        this.spawnCommandSync('bash', [stopScript]);
      }
    }

    this.log(chalk.green('\n✨ Development environment action completed!'));
    this.log(chalk.yellow('\nYou can run this wizard again with:'));
    this.log(chalk.white('  rapid build:lifecycle'));
  }
}; 