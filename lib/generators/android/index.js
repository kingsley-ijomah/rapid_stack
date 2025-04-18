'use strict';
const { execSync } = require('child_process');
const BaseGenerator = require('../base');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { getShellConfig, addEnvVarsToShellConfig, getSourceCommand } = require('../../lib/utils');

module.exports = class extends BaseGenerator {
  constructor(args, opts) {
    super(args, opts);
  }

  async initializing() {
    this.log('\n' + '='.repeat(80));
    this.log('🤖 Android Project Setup');
    this.log('='.repeat(80));

    // Check if frontend directory exists
    const frontendDir = path.join(process.cwd(), 'frontend');
    if (!fs.existsSync(frontendDir)) {
      this.log('\n❌ Frontend directory not found!');
      this.log('='.repeat(80));
      this.log('\nPlease ensure you have generated a frontend project and it is in the current directory.');
      this.log('\nTo generate a frontend project, run:');
      this.log('  rapid build:frontend');
      this.log('\nAfter generating the frontend project, run this command again.');
      this.log('\n' + '='.repeat(80) + '\n');
      process.exit(1);
    }

    // Check for Android Studio installation
    try {
      const androidStudioPath = '/Applications/Android Studio.app';
      if (fs.existsSync(androidStudioPath)) {
        this.log('\n✓ Android Studio is installed');
      } else {
        this.log('\n❌ Android Studio is not installed!');
        
        const installAnswer = await this.prompt([
          {
            type: 'confirm',
            name: 'installAndroidStudio',
            message: 'Would you like to install Android Studio now?',
            default: true
          }
        ]);

        if (installAnswer.installAndroidStudio) {
          this.log('\n⚠️  Android Studio must be installed from the official website.');
          this.log('Please follow these steps:');
          this.log('1. Visit https://developer.android.com/studio');
          this.log('2. Download Android Studio for macOS');
          this.log('3. Open the downloaded .dmg file');
          this.log('4. Drag Android Studio to the Applications folder');
          this.log('5. Open Android Studio and complete the setup wizard');
          this.log('6. Run this command again');
          this.log('\n' + '='.repeat(80) + '\n');
          process.exit(1);
        } else {
          this.log('\n⚠️  Android Studio installation skipped.');
          this.log('Please install Android Studio manually and run this command again.');
          this.log('\n' + '='.repeat(80) + '\n');
          process.exit(1);
        }
      }
    } catch (error) {
      this.log('\n❌ Error checking Android Studio installation:');
      this.log(error.message);
      process.exit(1);
    }

    // Check for Java installation
    try {
      const javaVersion = execSync('java -version', { encoding: 'utf8' }).trim();
      this.log(`\n✓ Java is installed: ${javaVersion.split('\n')[0]}`);
    } catch (error) {
      this.log('\n❌ Java is not installed!');
      
      const installAnswer = await this.prompt([
        {
          type: 'confirm',
          name: 'installJava',
          message: 'Would you like to install Java now?',
          default: true
        }
      ]);

      if (installAnswer.installJava) {
        this.log('\n⚠️  Java must be installed using Homebrew.');
        this.log('Please follow these steps:');
        this.log('1. Install Homebrew if not already installed:');
        this.log('   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
        this.log('2. Install Java:');
        this.log('   brew install openjdk');
        this.log('3. Run this command again');
        this.log('\n' + '='.repeat(80) + '\n');
        process.exit(1);
      } else {
        this.log('\n⚠️  Java installation skipped.');
        this.log('Please install Java manually and run this command again.');
        this.log('\n' + '='.repeat(80) + '\n');
        process.exit(1);
      }
    }

    // Check for Android SDK
    try {
      const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
      if (androidHome && fs.existsSync(androidHome)) {
        this.log('\n✓ Android SDK is installed');
      } else {
        // Check if the environment variables are defined in the shell config
        const { path: shellConfig } = getShellConfig();
        const configPath = shellConfig.replace('~', os.homedir());
        const existingConfig = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
        
        if (existingConfig.includes('ANDROID_HOME')) {
          // Environment variables are defined but not sourced in current session
          this.log('\n⚠️  Android SDK configuration exists but needs to be sourced');
          this.log('Sourcing configuration...');
          
          try {
            const { execSync } = require('child_process');
            const sourceCmd = getSourceCommand(shellConfig);
            execSync(sourceCmd, { stdio: 'inherit' });
            this.log('✓ Configuration sourced successfully');
          } catch (sourceError) {
            this.log('\n❌ Failed to source configuration:');
            this.log(sourceError.message);
            this.log('\nPlease run the following command manually:');
            this.log(`  ${getSourceCommand(shellConfig)}`);
            this.log('\nThen run this generator again.');
            this.log('\n' + '='.repeat(80) + '\n');
            process.exit(1);
          }
        } else {
          this.log('\n❌ Android SDK is not properly configured!');
          
          const installAnswer = await this.prompt([
            {
              type: 'confirm',
              name: 'configureSDK',
              message: 'Would you like to configure Android SDK environment variables now?',
              default: true
            }
          ]);

          if (installAnswer.configureSDK) {
            // Get shell configuration
            const { type: shellType, path: shellConfig, detectedShell } = getShellConfig();
            
            if (shellType === 'unknown') {
              this.log('\n⚠️  Unknown shell type detected. Defaulting to bash configuration.');
              this.log(`Detected shell: ${detectedShell}`);
            }
            
            // Create the environment variables
            const envVars = [
              '# Android SDK Configuration',
              'export ANDROID_HOME=$HOME/Library/Android/sdk',
              'export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools'
            ];

            try {
              const success = addEnvVarsToShellConfig(shellConfig, envVars);
              
              if (!success) {
                this.log(`\n⚠️  Android SDK configuration already exists in ${shellConfig}`);
                this.log('Using existing configuration...');
                
                // Continue with the rest of the setup
                this.log('\nContinuing with Android setup...');
              } else {
                this.log(`\n✓ Environment variables added to ${shellConfig}`);
                this.log('Configuration has been automatically sourced.');
                
                // Continue with the rest of the setup
                this.log('\nContinuing with Android setup...');
              }
            } catch (error) {
              this.log('\n❌ Failed to configure Android SDK environment variables:');
              this.log(error.message);
              this.log('\nPlease add these lines manually to your shell configuration file:');
              this.log(envVars.join('\n'));
              this.log('\nAfter adding the lines, run:');
              this.log(`  ${getSourceCommand(shellConfig)}`);
              this.log('\nThen run this generator again.');
              this.log('\n' + '='.repeat(80) + '\n');
              process.exit(1);
            }
          } else {
            this.log('\n⚠️  Android SDK configuration skipped.');
            this.log('Please configure the environment variables manually and run this command again.');
            this.log('\n' + '='.repeat(80) + '\n');
            process.exit(1);
          }
        }
      }
    } catch (error) {
      this.log('\n❌ Error checking Android SDK:');
      this.log(error.message);
      process.exit(1);
    }
  }

  async prompting() {
    // Placeholder for future prompts
    this.log('\n🚧 Android generator is under development');
    this.log('More features will be added soon!');
  }

  async install() {
    this.log('\n' + '='.repeat(80));
    this.log('🛠️  Setting up Android project');
    this.log('='.repeat(80));

    // Store the original directory
    const originalDir = process.cwd();
    const frontendDir = path.join(originalDir, 'frontend');

    try {
      // Check if frontend directory exists
      if (!fs.existsSync(frontendDir)) {
        throw new Error('Frontend directory not found. Please run this command from the root of your Rapid Stack project.');
      }

      // Change to frontend directory
      process.chdir(frontendDir);
      this.log(`\n📁 Working in: ${frontendDir}`);

      // Remove existing android directory
      this.log('\n🗑️  Removing existing Android directory...');
      execSync('rm -rf android', { stdio: 'inherit' });
      this.log('✓ Android directory removed');

      // Add Android platform
      this.log('\n📱 Adding Android platform...');
      execSync('npx cap add android', { stdio: 'inherit' });
      this.log('✓ Android platform added');

      // Build the project
      this.log('\n🏗️  Building project...');
      execSync('npm run build', { stdio: 'inherit' });
      this.log('✓ Project built successfully');

      // Sync Android project
      this.log('\n🔄 Syncing Android project...');
      execSync('npx cap sync android', { stdio: 'inherit' });
      this.log('✓ Android project synced');

      // Return to original directory
      process.chdir(originalDir);

      this.log('\n' + '='.repeat(80));
      this.log('🎉 Android setup completed successfully!');
      this.log('='.repeat(80));

      // Ask if user wants to open the project in Android Studio
      const openAnswer = await this.prompt([
        {
          type: 'confirm',
          name: 'openAndroidStudio',
          message: 'Would you like to open the project in Android Studio now?',
          default: true
        }
      ]);

      if (openAnswer.openAndroidStudio) {
        await this._openAndroidStudioProject(frontendDir);
      } else {
        this.log('\nNext steps:');
        this.log('\n1. Configure your signing certificates in Android Studio');
        this.log('2. Build and run your app');
      }
      this.log('\n' + '='.repeat(80) + '\n');
    } catch (error) {
      // Ensure we return to original directory even if there's an error
      process.chdir(originalDir);

      this.log('\n' + '='.repeat(80));
      this.log('❌ Error setting up Android project:');
      this.log('='.repeat(80));
      this.log('\nError details:');
      this.log(error.message);
      this.log('\nPlease check the error above and try again.');
      this.log('\n' + '='.repeat(80) + '\n');
      process.exit(1);
    }
  }

  async _openAndroidStudioProject(frontendDir) {
    try {
      this.log('\n🚀 Opening project in Android Studio...');
      process.chdir(frontendDir);
      execSync('npx cap open android', { stdio: 'inherit' });
      this.log('✓ Project opened in Android Studio');
    } catch (error) {
      this.log('\n⚠️  Could not open project in Android Studio:');
      this.log(error.message);
      this.log('\nYou can try opening it manually with:');
      this.log('  npx cap open android');
    }
  }
}; 