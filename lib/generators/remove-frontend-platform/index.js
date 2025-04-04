const Generator = require('yeoman-generator');
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');

class RemovePlatformGenerator extends Generator {
  constructor(args, opts) {
    super(args, opts);
    this.frontendPath = path.resolve(this.destinationPath(), './frontend/src/app/platforms');
  }

  _toKebabCase(str) {
    return str
      // Convert camelCase to kebab-case (handle uppercase letters)
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      // Replace any non-alphanumeric characters with hyphens
      .replace(/[^a-zA-Z0-9]+/g, '-')
      // Convert to lowercase
      .toLowerCase()
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, '');
  }

  _toCamelCase(str) {
    // First convert to kebab case (handle spaces, underscores, etc)
    const kebabCase = str
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
      .replace(/[^a-zA-Z0-9]/g, '');
    
    // Then ensure first character is lowercase
    return kebabCase.charAt(0).toLowerCase() + kebabCase.slice(1);
  }

  _capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  _getPlatforms() {
    try {
      return fs.readdirSync(this.frontendPath)
        .filter(item => {
          const fullPath = path.join(this.frontendPath, item);
          return fs.statSync(fullPath).isDirectory();
        })
        .map(dir => ({
          name: this._capitalize(dir),
          value: dir
        }));
    } catch (error) {
      return [];
    }
  }

  async prompting() {
    const platformChoices = this._getPlatforms();
    
    if (platformChoices.length === 0) {
      this.log('No platforms found in the frontend directory');
      return;
    }

    const answers = await this.prompt([
      {
        type: 'list',
        name: 'selectedPlatform',
        message: 'Which platform would you like to remove?',
        choices: platformChoices,
      },
      {
        type: 'confirm',
        name: 'confirmRemoval',
        message: answers => `Are you sure you want to remove the ${answers.selectedPlatform} platform? This action cannot be undone.`,
        default: false
      }
    ]);

    this.answers = answers;
  }

  _removeFromAppRoutes(platformName) {
    const appRoutesPath = path.join(process.cwd(), 'frontend/src/app/app.routes.ts');
    
    if (!fs.existsSync(appRoutesPath)) {
      this.log.error('app.routes.ts not found');
      return;
    }

    try {
      let content = fs.readFileSync(appRoutesPath, 'utf8');
      let routesRemoved = 0;
      
      // Special case for "my-section" which we know exists in the routes
      if (platformName.toLowerCase() === "mysection") {
        this.log(`Special case handling for 'my-section' route`);
        
        // Look for the route with 'my-section' path
        if (content.includes(`path: 'my-section'`)) {
          this.log(`Found hardcoded path: 'my-section'`);
          
          // Extract the route containing 'my-section'
          const parts = content.split(`path: 'my-section'`);
          if (parts.length >= 2) {
            // Find the closing brace for this route
            let openBraces = 1;
            let closingPos = 0;
            const routePart = parts[1];
            
            for (let i = 0; i < routePart.length; i++) {
              if (routePart[i] === '{') openBraces++;
              if (routePart[i] === '}') openBraces--;
              
              if (openBraces === 0) {
                closingPos = i;
                break;
              }
            }
            
            // Get the full route
            const fullRoute = `  {\n    path: 'my-section'${routePart.substring(0, closingPos+1)}`;
            this.log(`Removing route: ${fullRoute}`);
            
            // Remove this route
            content = content.replace(fullRoute, '');
            
            // Clean up the file
            const cleanedContent = this._cleanupRoutesFile(content);
            fs.writeFileSync(appRoutesPath, cleanedContent, 'utf8');
            this.log.ok(`Removed 'my-section' route from app.routes.ts`);
            return;
          }
        }
      }
      
      // If we didn't handle the special case, resort to regex approach
      const kebabPath = this._toKebabCase(platformName);
      this.log(`Trying to remove route with path: '${kebabPath}'`);
      
      // Look for any routes with the kebab path
      const routeRegex = new RegExp(`\\s*{[^{]*?path:\\s*['"]${kebabPath}['"][^}]*?},?`, 'g');
      
      // Remove matching routes
      const newContent = content.replace(routeRegex, '');
      
      if (newContent !== content) {
        // We found and removed at least one route
        const cleanedContent = this._cleanupRoutesFile(newContent);
        fs.writeFileSync(appRoutesPath, cleanedContent, 'utf8');
        this.log.ok(`Removed route for '${kebabPath}' from app.routes.ts`);
      } else {
        this.log.error(`Could not find any routes with path: '${kebabPath}' in app.routes.ts`);
      }
      
    } catch (error) {
      this.log.error(`Error updating app.routes.ts: ${error.message}`);
    }
  }

  _cleanupRoutesFile(content) {
    // First, normalize line endings and remove extra whitespace
    let cleaned = content.replace(/\r\n/g, '\n').replace(/\s+\n/g, '\n');
    
    // Fix route array formatting
    cleaned = cleaned
      // Remove empty lines between routes
      .replace(/\n\s*\n/g, '\n')
      // Fix multiple commas
      .replace(/,\s*,/g, ',')
      // Fix trailing comma before closing bracket
      .replace(/,(\s*)\]/g, '\n]')
      // Fix leading comma after opening brace
      .replace(/{\s*,/g, '{')
      // Fix leading comma after opening bracket
      .replace(/\[\s*,/g, '[')
      // Fix trailing comma before closing brace
      .replace(/,(\s*)\}/g, '\n  }')
      // Ensure proper spacing around routes array
      .replace(/(\nexport const routes: Routes = \[)/, '\n$1\n')
      .replace(/\];(?!\n)/, '\n];')
      // Ensure proper indentation
      .replace(/^( {0,2}){(?!\s*$)/gm, '  {')
      // Remove extra newlines at the end
      .replace(/\n+$/, '\n');

    return cleaned;
  }

  writing() {
    if (!this.answers.selectedPlatform || !this.answers.confirmRemoval) {
      this.log('Platform removal cancelled');
      return;
    }

    const platformPath = path.join(this.frontendPath, this.answers.selectedPlatform);
    
    try {
      // Remove the platform directory
      if (fs.existsSync(platformPath)) {
        rimraf.sync(platformPath);
        this.log(`Successfully removed ${this.answers.selectedPlatform} platform directory`);
        
        // Remove the platform's route from app.routes.ts
        this._removeFromAppRoutes(this.answers.selectedPlatform);
      } else {
        this.log(`Platform directory not found: ${this.answers.selectedPlatform}`);
      }
    } catch (error) {
      this.log(`Error during platform removal: ${error.message}`);
    }
  }
}

module.exports = RemovePlatformGenerator; 