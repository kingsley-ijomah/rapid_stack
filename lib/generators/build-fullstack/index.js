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

    this.log('\nCreating devops...');
    try {
      execSync('rapid build:devops --yes --force', { stdio: 'inherit' });
      this.log('✓ Devops created successfully');
    } catch (error) {
      this.log.error('Failed to create devops:', error);
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

    this.log('\nBuild graphql...');
    try {
      execSync('rapid graphql --yes --force', { stdio: 'inherit' });
      this.log('✓ Graphql created successfully');
    } catch (error) {
      this.log.error('Failed to create graphql:', error);
      process.exit(1);
    }

    this.log('\nBuild backend auth...');
    try {
      execSync('rapid backend:auth --yes --force', { stdio: 'inherit' });
      this.log('✓ Backend auth created successfully');
    } catch (error) {
      this.log.error('Failed to create backend auth:', error);
      process.exit(1);
    }

    this.log('\nBuild frontend auth...'); 
    try {
      execSync('rapid frontend:auth --yes --force', { stdio: 'inherit' });
      this.log('✓ Frontend auth created successfully');
    } catch (error) {
      this.log.error('Failed to create frontend auth:', error);
      process.exit(1);
    }

    this.log('\nBuild frontend company...');
    try {
      execSync('rapid frontend:company --yes --force', { stdio: 'inherit' });
      this.log('✓ Frontend company created successfully');
    } catch (error) {
      this.log.error('Failed to create frontend company:', error);
      process.exit(1);
    }

    this.log('\nBuild frontend home...'); 
    try {
      execSync('rapid frontend:home --yes --force', { stdio: 'inherit' });
      this.log('✓ Frontend home created successfully');
    } catch (error) {
      this.log.error('Failed to create frontend home:', error);
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