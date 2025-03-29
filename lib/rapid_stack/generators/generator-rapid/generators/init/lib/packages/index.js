const packages = {
  // System packages (managed by system package managers)
  git: {
    name: 'git',
    command: 'git',
    minVersion: '2.49.0',
    packageManager: {
      linux: 'nix',
      darwin: 'brew'
    },
    requiredVersion: '2.49.0',
    installCommand: 'git',
    versionCommand: 'git --version'
  },
  mongodb: {
    name: 'mongodb',
    command: 'mongod',
    minVersion: '6.0.0',
    packageManager: {
      linux: 'nix',
      darwin: 'brew'
    },
    requiredVersion: '6.0.0',
    installCommand: 'mongod',
    versionCommand: 'mongod --version'
  },
  docker: {
    name: 'docker',
    command: 'docker',
    minVersion: '24.0.0',
    packageManager: {
      linux: 'nix',
      darwin: 'brew'
    },
    requiredVersion: '24.0.0',
    installCommand: 'docker',
    versionCommand: 'docker --version'
  },
  ansible: {
    name: 'ansible',
    command: 'ansible',
    minVersion: '2.9.0',
    packageManager: {
      linux: 'nix',
      darwin: 'brew'
    },
    requiredVersion: '2.9.0',
    installCommand: 'ansible',
    versionCommand: 'ansible --version'
  },

  // ASDF managed packages
  gh: {
    name: 'github-cli',
    command: 'gh',
    minVersion: '2.45.0',
    packageManager: {
      linux: 'asdf',
      darwin: 'asdf'
    },
    requiredVersion: '2.45.0',
    installCommand: 'gh',
    versionCommand: 'gh --version'
  },
  doctl: {
    name: 'doctl',
    command: 'doctl',
    minVersion: '1.94.0',
    packageManager: {
      linux: 'asdf',
      darwin: 'asdf'
    },
    requiredVersion: '1.94.0',
    installCommand: 'doctl',
    versionCommand: 'doctl version'
  },
  terraform: {
    name: 'terraform',
    command: 'terraform',
    minVersion: '1.7.0',
    packageManager: {
      linux: 'asdf',
      darwin: 'asdf'
    },
    requiredVersion: '1.7.0',
    installCommand: 'terraform',
    versionCommand: 'terraform --version'
  },
  ruby: {
    name: 'ruby',
    command: 'ruby',
    minVersion: '3.3.0',
    packageManager: {
      linux: 'asdf',
      darwin: 'asdf'
    },
    requiredVersion: '3.3.0',
    installCommand: 'ruby',
    versionCommand: 'ruby --version'
  },
  node: {
    name: 'nodejs',
    command: 'node',
    minVersion: '20.0.0',
    packageManager: {
      linux: 'asdf',
      darwin: 'asdf'
    },
    requiredVersion: '20.0.0',
    installCommand: 'node',
    versionCommand: 'node --version'
  },

  // Gem managed packages
  rails: {
    name: 'rails',
    command: 'rails',
    minVersion: '8.0.0',
    packageManager: {
      linux: 'gem',
      darwin: 'gem'
    },
    requiredVersion: '8.0.0',
    installCommand: 'rails',
    versionCommand: 'rails --version'
  },

  // NPM managed packages
  npm: {
    name: 'npm',
    command: 'npm',
    minVersion: '10.0.0',
    packageManager: {
      linux: 'npm',
      darwin: 'npm'
    },
    requiredVersion: '10.0.0',
    installCommand: 'npm',
    versionCommand: 'npm --version'
  },
  ionic: {
    name: 'ionic',
    command: 'ionic',
    minVersion: '7.0.0',
    packageManager: {
      linux: 'npm',
      darwin: 'npm'
    },
    requiredVersion: '7.0.0',
    installCommand: 'ionic',
    versionCommand: 'ionic --version'
  },
  angular: {
    name: 'angular-cli',
    command: 'ng',
    minVersion: '17.0.0',
    packageManager: {
      linux: 'npm',
      darwin: 'npm'
    },
    requiredVersion: '17.0.0',
    installCommand: 'ng',
    versionCommand: 'ng version'
  }
};

module.exports = packages; 