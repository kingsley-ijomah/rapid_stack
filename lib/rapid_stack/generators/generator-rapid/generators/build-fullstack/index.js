const Generator = require('yeoman-generator');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
    
    // Add debug option
    this.option('debug', {
      desc: 'Enable debug mode',
      type: Boolean,
      default: false
    });
  }

  async writing() {
    this.log('Creating frontend...');
    try {
      execSync('rapid build:frontend --yes --force', { stdio: 'inherit' });
      this.log('✓ Frontend created successfully');
    } catch (error) {
      this.log.error('Failed to create frontend:', error);
      process.exit(1);
    }

    this.log('\nCreating backend...');
    try {
      execSync('rapid build:backend --yes --force', { stdio: 'inherit' });
      this.log('✓ Backend created successfully');
    } catch (error) {
      this.log.error('Failed to create backend:', error);
      process.exit(1);
    }

    this.log('\nCreating default schema...');
    try {
      execSync('rapid schema:create --auth-only --yes --force', { stdio: 'inherit' });
      this.log('✓ Default schema created successfully');
    } catch (error) {
      this.log.error('Failed to create default schema:', error);
      process.exit(1);
    }

    this.log('\nRunning backend schema runner...');
    try {
      execSync('rapid schema:run --yes --force', { stdio: 'inherit' });
      this.log('✓ Backend schema runner completed successfully');
    } catch (error) {
      this.log.error('Failed to run backend schema runner:', error);
      process.exit(1);
    }

    this.log('\n✓ Fullstack application created successfully!');
  }

  _debugLog(message) {
    if (this.options.debug) {
      this.log(message);
    }
  }
}; 