const packages = {
  // System packages (managed by system package managers)
  git: {
    name: {
      brew: 'git',
      nix: 'git'
    },
    minVersion: '2.49.0',
    packageManager: {
      linux: 'nix',
      darwin: 'brew'
    },
    installCommand: {
      brew: 'git',
      nix: 'git'
    },
    versionCommand: 'git --version'
  },
  mongodb: {
    name: {
      brew: 'mongodb-community@6.0',
      nix: 'mongodb'
    },
    minVersion: '6.0.0',
    packageManager: {
      linux: 'nix',
      darwin: 'brew'
    },
    installCommand: {
      brew: 'mongodb-community@6.0',
      nix: 'mongodb'
    },
    versionCommand: 'mongod --version',
    taps: {
      brew: ['mongodb/brew']
    },
    startService: true
  },
  docker: {
    name: {
      brew: 'docker',
      nix: 'docker'
    },
    minVersion: '24.0.0',
    packageManager: {
      linux: 'nix',
      darwin: 'brew'
    },
    installCommand: {
      brew: 'docker',
      nix: 'docker'
    },
    versionCommand: 'docker --version'
  },
  ansible: {
    name: {
      brew: 'ansible',
      nix: 'ansible'
    },
    minVersion: '2.9.0',
    packageManager: {
      linux: 'nix',
      darwin: 'brew'
    },
    installCommand: {
      brew: 'ansible',
      nix: 'ansible'
    },
    versionCommand: 'ansible --version'
  },

  // ASDF managed packages
  gh: {
    name: {
      asdf: 'github-cli'
    },
    minVersion: '2.45.0',
    packageManager: {
      linux: 'asdf',
      darwin: 'asdf'
    },
    installCommand: {
      asdf: 'gh'
    },
    versionCommand: 'gh --version'
  },
  // Digital Ocean CLI
  doctl: {
    name: {
      asdf: 'doctl'
    },
    minVersion: '1.94.0',
    packageManager: {
      linux: 'asdf',
      darwin: 'asdf'
    },
    installCommand: {
      asdf: 'doctl'
    },
    versionCommand: 'doctl version'
  },
  terraform: {
    name: {
      asdf: 'terraform'
    },
    minVersion: '1.7.0',
    packageManager: {
      linux: 'asdf',
      darwin: 'asdf'
    },
    installCommand: {
      asdf: 'terraform'
    },
    versionCommand: 'terraform --version'
  },
  ruby: {
    name: {
      asdf: 'ruby'
    },
    minVersion: '3.3.0',
    packageManager: {
      linux: 'asdf',
      darwin: 'asdf'
    },
    installCommand: {
      asdf: 'ruby'
    },
    versionCommand: 'ruby --version'
  },
  node: {
    name: {
      asdf: 'nodejs'
    },
    minVersion: '20.0.0',
    packageManager: {
      linux: 'asdf',
      darwin: 'asdf'
    },
    installCommand: {
      asdf: 'node'
    },
    versionCommand: 'node --version'
  },

  // Gem managed packages
  rails: {
    name: {
      gem: 'rails'
    },
    minVersion: '8.0.0',
    packageManager: {
      linux: 'gem',
      darwin: 'gem'
    },
    installCommand: {
      gem: 'rails'
    },
    versionCommand: 'rails --version'
  },

  // NPM managed packages
  npm: {
    name: {
      npm: 'npm'
    },
    minVersion: '10.0.0',
    packageManager: {
      linux: 'npm',
      darwin: 'npm'
    },
    installCommand: {
      npm: 'npm'
    },
    versionCommand: 'npm --version'
  },
  ionic: {
    name: {
      npm: 'ionic'
    },
    minVersion: '7.0.0',
    packageManager: {
      linux: 'npm',
      darwin: 'npm'
    },
    installCommand: {
      npm: 'ionic'
    },
    versionCommand: 'ionic --version'
  }
};

module.exports = packages; 