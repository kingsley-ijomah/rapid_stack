const packages = {
  // System packages (managed by system package managers)
  git: {
    name: 'git',
    command: 'git',
    minVersion: '2.49.0',
    packageManager: {
      linux: 'nix',
      darwin: 'brew'
    }
  },
  mongodb: {
    name: 'mongodb',
    command: 'mongod',
    minVersion: '6.0.0',
    packageManager: {
      linux: 'nix',
      darwin: 'brew'
    }
  },
  docker: {
    name: 'docker',
    command: 'docker',
    minVersion: '24.0.0',
    packageManager: {
      linux: 'nix',
      darwin: 'brew'
    }
  },
  ansible: {
    name: 'ansible',
    command: 'ansible',
    minVersion: '2.9.0',
    packageManager: {
      linux: 'nix',
      darwin: 'brew'
    }
  },

  // ASDF managed packages
  gh: {
    name: 'gh',
    command: 'gh',
    minVersion: '2.45.0',
    packageManager: {
      linux: 'asdf',
      darwin: 'asdf'
    }
  },
  doctl: {
    name: 'doctl',
    command: 'doctl',
    minVersion: '1.94.0',
    packageManager: {
      linux: 'asdf',
      darwin: 'asdf'
    }
  },
  terraform: {
    name: 'terraform',
    command: 'terraform',
    minVersion: '1.7.0',
    packageManager: {
      linux: 'asdf',
      darwin: 'asdf'
    }
  },
  ruby: {
    name: 'ruby',
    command: 'ruby',
    minVersion: '3.3.0',
    packageManager: {
      linux: 'asdf',
      darwin: 'asdf'
    }
  },
  node: {
    name: 'node',
    command: 'node',
    minVersion: '20.0.0',
    packageManager: {
      linux: 'asdf',
      darwin: 'asdf'
    }
  },

  // Gem managed packages
  rails: {
    name: 'rails',
    command: 'rails',
    minVersion: '8.0.0',
    packageManager: {
      linux: 'gem',
      darwin: 'gem'
    }
  },

  // NPM managed packages
  npm: {
    name: 'npm',
    command: 'npm',
    minVersion: '10.0.0',
    packageManager: {
      linux: 'npm',
      darwin: 'npm'
    }
  },
  ionic: {
    name: 'ionic',
    command: 'ionic',
    minVersion: '7.0.0',
    packageManager: {
      linux: 'npm',
      darwin: 'npm'
    }
  },
  angular: {
    name: 'angular',
    command: 'ng',
    minVersion: '17.0.0',
    packageManager: {
      linux: 'npm',
      darwin: 'npm'
    }
  }
};

module.exports = packages; 