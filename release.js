#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt for user input
const prompt = (question) => new Promise((resolve) => rl.question(question, resolve));

// Get current version from package.json
function getCurrentVersion() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return packageJson.version;
}

// Update version in package.json
function updateVersion(newVersion) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  packageJson.version = newVersion;
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');
}

// Validate version format
function validateVersion(version) {
  return /^\d+\.\d+\.\d+$/.test(version);
}

// Get git commits since last tag
function getCommitsSinceLastTag() {
  try {
    const lastTag = execSync('git describe --tags --abbrev=0 2>/dev/null').toString().trim();
    return execSync(`git log ${lastTag}..HEAD --pretty=format:"%s"`).toString().split('\n');
  } catch (error) {
    return execSync('git log --pretty=format:"%s"').toString().split('\n');
  }
}

// Parse commit message
function parseCommitMessage(message) {
  const patterns = {
    feat: /^feat: (.+)$/i,
    fix: /^fix: (.+)$/i,
    change: /^change: (.+)$/i,
    remove: /^remove: (.+)$/i
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    const match = message.match(pattern);
    if (match) return [type, match[1]];
  }
  return null;
}

// Get changes from commits
async function getChangesFromCommits() {
  const changes = {
    feat: [],
    fix: [],
    change: [],
    remove: []
  };

  const commits = getCommitsSinceLastTag();
  if (commits.length === 0) return changes;

  console.log('\nFound the following changes in commits:');
  console.log('----------------------------------------');

  commits.forEach(commit => {
    const result = parseCommitMessage(commit);
    if (!result) return;
    const [type, message] = result;
    changes[type].push(message);
    console.log(`${type.toUpperCase()}: ${message}`);
  });

  const useCommits = await prompt('\nDo you want to use these changes for the changelog? [Y/n]: ');
  if (useCommits.toLowerCase() !== 'n') return changes;

  return await getChangesManually();
}

// Get changes manually
async function getChangesManually() {
  const changes = {
    feat: [],
    fix: [],
    change: [],
    remove: []
  };

  console.log('\nEnter changes manually:');
  for (const type of Object.keys(changes)) {
    console.log(`\n${type.toUpperCase()} changes:`);
    console.log('Enter each change and press Enter. Press Enter twice to finish this category.');
    
    while (true) {
      const change = await prompt('> ');
      if (!change) break;
      changes[type].push(change);
    }
  }

  return changes;
}

// Update CHANGELOG.md
function updateChangelog(version, changes) {
  const changelogPath = path.join(__dirname, 'CHANGELOG.md');
  const currentContent = fs.readFileSync(changelogPath, 'utf8');
  const today = new Date().toISOString().split('T')[0];

  const newEntry = [
    `## [${version}] - ${today}`
  ];

  Object.entries(changes).forEach(([type, items]) => {
    if (items.length === 0) return;
    newEntry.push(`### ${type.charAt(0).toUpperCase() + type.slice(1)}`);
    items.forEach(item => newEntry.push(`- ${item}`));
    newEntry.push('');
  });

  const updatedContent = newEntry.join('\n') + '\n' + currentContent;
  fs.writeFileSync(changelogPath, updatedContent);
}

// Build and publish to npm
async function publishToNpm(version) {
  console.log('\nBuilding and publishing to npm...');
  
  try {
    // Build the package
    execSync('npm run build', { stdio: 'inherit' });
    
    // Publish to npm
    execSync('npm publish', { stdio: 'inherit' });
    
    console.log('Package published successfully!');
  } catch (error) {
    console.error('Failed to publish package:', error.message);
    process.exit(1);
  }
}

// Handle git operations
async function handleGitOperations(version) {
  console.log('\nPreparing git operations for release...');
  
  try {
    // Stage all changes
    execSync('git add .', { stdio: 'inherit' });
    
    // Commit changes
    execSync(`git commit -m "Release version ${version}"`, { stdio: 'inherit' });
    
    // Create tag
    execSync(`git tag -a v${version} -m "Release version ${version}"`, { stdio: 'inherit' });
    
    // Push changes
    const shouldPush = await prompt('\nPush changes to remote? [Y/n]: ');
    if (shouldPush.toLowerCase() !== 'n') {
      execSync('git push origin main', { stdio: 'inherit' });
      execSync(`git push origin v${version}`, { stdio: 'inherit' });
      console.log('Changes and tag pushed to remote successfully!');
    } else {
      console.log('Skipping push to remote. You can push manually later.');
    }
  } catch (error) {
    console.error('Git operations failed:', error.message);
    process.exit(1);
  }
}

// Main function
async function main() {
  console.log('\n============================================');
  console.log(' Rapid Stack NPM Release Helper');
  console.log('============================================\n');

  const currentVersion = getCurrentVersion();
  console.log(`Current version: ${currentVersion}`);

  while (true) {
    const newVersion = await prompt('\nEnter new version (format: major.minor.patch): ');
    
    if (!newVersion) {
      console.log('\nRelease process cancelled.');
      process.exit(0);
    }

    if (validateVersion(newVersion)) {
      console.log(`\nUpdating version from ${currentVersion} to ${newVersion}...`);
      updateVersion(newVersion);
      console.log('Version updated successfully!');

      console.log('\nNow let\'s update the CHANGELOG.md...');
      const changes = await getChangesFromCommits();
      updateChangelog(newVersion, changes);
      console.log('CHANGELOG.md updated successfully!');

      await publishToNpm(newVersion);
      await handleGitOperations(newVersion);
      break;
    } else {
      console.log('Invalid version format. Please use major.minor.patch (e.g., 0.1.1)');
    }
  }

  rl.close();
}

// Run the script
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 