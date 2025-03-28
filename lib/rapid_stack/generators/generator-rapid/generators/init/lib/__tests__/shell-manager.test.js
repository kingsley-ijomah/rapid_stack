const fs = require('fs');
const path = require('path');
const os = require('os');
const ShellManager = require('../shell-manager');

// Mock fs and os modules
jest.mock('fs');
jest.mock('os');

describe('ShellManager', () => {
  let shellManager;
  let mockHomeDir;
  let mockConfigFile;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    mockHomeDir = '/mock/home/dir';
    os.homedir.mockReturnValue(mockHomeDir);
    shellManager = new ShellManager();

    // Setup mock config file path
    mockConfigFile = path.join(mockHomeDir, '.zshrc');
  });

  afterEach(() => {
    // Restore console methods
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe('addHomebrewPaths', () => {
    const configFile = '/mock/home/dir/.zshrc';
    const homebrewPaths = ['/opt/homebrew/bin', '/opt/homebrew/sbin'];

    beforeEach(() => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('');
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('should add PATH line at the beginning when file is empty', async () => {
      const result = await shellManager.addHomebrewPaths();
      expect(result).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        configFile,
        expect.stringContaining('export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$PATH"')
      );
    });

    it('should add PATH line before first export statement', async () => {
      fs.readFileSync.mockReturnValue('export SOME_VAR=value\n');
      const result = await shellManager.addHomebrewPaths();
      expect(result).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        configFile,
        expect.stringContaining('export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$PATH"')
      );
    });

    it('should update existing non-appending PATH line', async () => {
      fs.readFileSync.mockReturnValue('export PATH="/usr/local/bin:$PATH"\n');
      const result = await shellManager.addHomebrewPaths();
      expect(result).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        configFile,
        expect.stringContaining('export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:$PATH"')
      );
    });

    it('should handle commented out PATH lines', async () => {
      fs.readFileSync.mockReturnValue('# export PATH="/usr/local/bin:$PATH"\n');
      const result = await shellManager.addHomebrewPaths();
      expect(result).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        configFile,
        expect.stringContaining('export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$PATH"')
      );
    });

    it('should handle file write errors', async () => {
      fs.writeFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });
      const result = await shellManager.addHomebrewPaths();
      expect(result).toBe(false);
    });

    it('should handle non-existent config file', async () => {
      fs.existsSync.mockReturnValue(false);
      const result = await shellManager.addHomebrewPaths();
      expect(result).toBe(false);
    });

    it('should not duplicate Homebrew paths when running multiple times', async () => {
      // First run
      fs.readFileSync.mockReturnValue('export PATH="/usr/local/bin:$PATH"\n');
      await shellManager.addHomebrewPaths();
      
      // Second run with the result of the first run
      const firstRunContent = fs.writeFileSync.mock.calls[0][1];
      fs.readFileSync.mockReturnValue(firstRunContent);
      await shellManager.addHomebrewPaths();
      
      // Check that Homebrew paths appear only once
      const finalContent = fs.writeFileSync.mock.calls[1][1];
      const homebrewPathCount = (finalContent.match(/\/opt\/homebrew\/bin/g) || []).length;
      expect(homebrewPathCount).toBe(1);
    });

    it('should create new PATH line when existing PATH contains variables', async () => {
      // Mock a PATH line that contains variables
      fs.readFileSync.mockReturnValue('export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$HOME/.nvm/versions/node/v20.15.0/bin:$PATH"\n');
      const result = await shellManager.addHomebrewPaths();
      
      expect(result).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        configFile,
        expect.stringContaining('export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$PATH"')
      );
    });
  });

  describe('addNixPaths', () => {
    const configFile = '/mock/home/dir/.zshrc';
    const nixPaths = [
      '/mock/home/dir/.nix-profile/bin',
      '/mock/home/dir/.nix-profile/sbin'
    ];

    beforeEach(() => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('');
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('should add PATH line at the beginning when file is empty', async () => {
      const result = await shellManager.addNixPaths();
      expect(result).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        configFile,
        expect.stringContaining(`export PATH="${nixPaths.join(':')}:$PATH"`)
      );
    });

    it('should add PATH line before first export statement', async () => {
      fs.readFileSync.mockReturnValue('export SOME_VAR=value\n');
      const result = await shellManager.addNixPaths();
      expect(result).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        configFile,
        expect.stringContaining(`export PATH="${nixPaths.join(':')}:$PATH"`)
      );
    });

    it('should update existing non-appending PATH line', async () => {
      fs.readFileSync.mockReturnValue('export PATH="/usr/local/bin:$PATH"\n');
      const result = await shellManager.addNixPaths();
      expect(result).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        configFile,
        expect.stringContaining(`export PATH="${nixPaths.join(':')}:/usr/local/bin:$PATH"`)
      );
    });

    it('should handle commented out PATH lines', async () => {
      fs.readFileSync.mockReturnValue('# export PATH="/usr/local/bin:$PATH"\n');
      const result = await shellManager.addNixPaths();
      expect(result).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        configFile,
        expect.stringContaining(`export PATH="${nixPaths.join(':')}:$PATH"`)
      );
    });

    it('should handle file write errors', async () => {
      fs.writeFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });
      const result = await shellManager.addNixPaths();
      expect(result).toBe(false);
    });

    it('should handle non-existent config file', async () => {
      fs.existsSync.mockReturnValue(false);
      const result = await shellManager.addNixPaths();
      expect(result).toBe(false);
    });

    it('should not duplicate Nix paths when running multiple times', async () => {
      // First run
      fs.readFileSync.mockReturnValue('export PATH="/usr/local/bin:$PATH"\n');
      await shellManager.addNixPaths();
      
      // Second run with the result of the first run
      const firstRunContent = fs.writeFileSync.mock.calls[0][1];
      fs.readFileSync.mockReturnValue(firstRunContent);
      await shellManager.addNixPaths();
      
      // Check that Nix paths appear only once
      const finalContent = fs.writeFileSync.mock.calls[1][1];
      const nixPathCount = (finalContent.match(/\.nix-profile\/bin/g) || []).length;
      expect(nixPathCount).toBe(1);
    });

    it('should create new PATH line when existing PATH contains variables', async () => {
      // Mock a PATH line that contains variables
      fs.readFileSync.mockReturnValue('export PATH="/usr/local/bin:$HOME/.nvm/versions/node/v20.15.0/bin:$PATH"\n');
      const result = await shellManager.addNixPaths();
      
      expect(result).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        configFile,
        expect.stringContaining(`export PATH="${nixPaths.join(':')}:$PATH"`)
      );
    });
  });

  describe('reloadConfig', () => {
    beforeEach(() => {
      // Mock console.log to capture output
      console.log.mockImplementation(() => {});
    });

    it('should show correct source command for zsh shell', async () => {
      // Mock shell to be zsh
      process.env.SHELL = '/bin/zsh';
      const zshManager = new ShellManager();
      await zshManager.reloadConfig();
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('source ~/.zshrc')
      );
    });

    it('should show correct source command for bash shell', async () => {
      // Mock shell to be bash
      process.env.SHELL = '/bin/bash';
      const bashManager = new ShellManager();
      await bashManager.reloadConfig();
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('source ~/.bashrc')
      );
    });

    it('should show correct source command for other shells', async () => {
      // Mock shell to be fish
      process.env.SHELL = '/usr/local/bin/fish';
      const fishManager = new ShellManager();
      await fishManager.reloadConfig();
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('source ~/.fishrc')
      );
    });
  });
}); 