const Generator = require('yeoman-generator');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');

class RemoveFrontendAuthGenerator extends Generator {
  constructor(args, opts) {
    super(args, opts);
    
    // Fixed values for folder name and destination path
    this.frontendMutationsPath = 'frontend/src/app/graphql/mutations/auth';
    this.frontendPagesPath = 'frontend/src/app/auth/pages';
    
    // List of mutation files to remove
    this.mutations = [
      'signIn.mutation.ts',
      'signUp.mutation.ts',
      'logout.mutation.ts',
      'passwordReset.mutation.ts',
      'updatePassword.mutation.ts',
      'otpRequest.mutation.ts',
      'updateUser.mutation.ts'
    ];
    
    // List of pages to remove
    this.pages = [
      'signup',
      'login',
      'forgot-password',
      'verify-otp',
      'update-user',
      'update-password'
    ];
    
    // List of routes to remove from auth.route.ts
    this.routes = [
      "path: ''",
      "path: 'login'",
      "path: 'signup'",
      "path: 'forgot-password'",
      "path: 'verify-otp'",
      "path: 'update-user'",
      "path: 'update-password'"
    ];
    
    // Track removed items for reporting
    this.removedItems = {
      mutations: [],
      pages: [],
      routes: []
    };
  }

  initializing() {
    this.log('This generator will remove frontend GraphQL mutation files and pages for authentication.');
  }

  async prompting() {
    this.answers = await this.prompt([
      {
        type: 'confirm',
        name: 'confirmRemoval',
        message: 'Are you sure you want to remove all frontend auth files?',
        default: false
      }
    ]);
    
    if (!this.answers.confirmRemoval) {
      this.log('Operation cancelled.');
      process.exit(0);
    }
  }

  writing() {
    this._removeAuthMutations();
    this._removeAuthPages();
    this._removeAuthComponentAndGuards();
    this._removeAuthRouteFromAppRoutes();
    this._restoreAuthServicePlaceholder();
  }
  
  _removeAuthMutations() {
    const destPath = path.join(process.cwd(), this.frontendMutationsPath);
    
    if (!fs.existsSync(destPath)) {
      this.log(`Mutations directory not found: ${destPath}`);
      return;
    }
    
    this.mutations.forEach(mutation => {
      const filePath = path.join(destPath, mutation);
      
      if (fs.existsSync(filePath)) {
        this.log(`Removing mutation file: ${mutation}`);
        fs.unlinkSync(filePath);
        this.removedItems.mutations.push(mutation);
      } else {
        this.log(`Mutation file not found: ${mutation}`);
      }
    });
    
    // Check if the directory is empty and remove it if it is
    if (fs.existsSync(destPath) && fs.readdirSync(destPath).length === 0) {
      this.log(`Removing empty mutations directory: ${destPath}`);
      fs.rmdirSync(destPath);
    }
  }
  
  _removeAuthPages() {
    const pagesPath = path.join(process.cwd(), this.frontendPagesPath);
    
    if (!fs.existsSync(pagesPath)) {
      this.log(`Pages directory not found: ${pagesPath}`);
      return;
    }
    
    this.pages.forEach(page => {
      const pagePath = path.join(pagesPath, page);
      
      if (fs.existsSync(pagePath)) {
        this.log(`Removing page directory: ${page}`);
        
        // Remove all files in the page directory
        const files = fs.readdirSync(pagePath);
        files.forEach(file => {
          const filePath = path.join(pagePath, file);
          fs.unlinkSync(filePath);
        });
        
        // Remove the directory
        fs.rmdirSync(pagePath);
        this.removedItems.pages.push(page);
      } else {
        this.log(`Page directory not found: ${page}`);
      }
    });
    
    // Check if the pages directory is empty and remove it if it is
    if (fs.existsSync(pagesPath) && fs.readdirSync(pagesPath).length === 0) {
      this.log(`Removing empty pages directory: ${pagesPath}`);
      fs.rmdirSync(pagesPath);
    }
  }
  
  _removeAuthComponentAndGuards() {
    const authPath = path.join(process.cwd(), 'frontend/src/app/auth');
    
    if (!fs.existsSync(authPath)) {
      this.log(`Auth directory not found: ${authPath}`);
      return;
    }
    
    // Instead of removing individual files, we'll remove the entire auth directory
    try {
      this.log('Removing entire auth directory and all its contents');
      
      // Use recursive directory deletion to remove the entire auth directory
      rimraf.sync(authPath);
      
      this.log('Auth directory successfully removed');
    } catch (error) {
      this.log.error(`Failed to remove auth directory: ${error.message}`);
    }
  }
  
  _removeAuthRouteFromAppRoutes() {
    const appRoutesPath = path.join(process.cwd(), 'frontend/src/app/app.routes.ts');
    
    if (!fs.existsSync(appRoutesPath)) {
      this.log.error(`app.routes.ts not found at: ${appRoutesPath}`);
      return;
    }
    
    let content = fs.readFileSync(appRoutesPath, 'utf8');
    
    // Remove auth-related imports
    const importsToRemove = [
      /import\s*{?\s*authGuard\s*}?\s*from\s*'\.\/auth\/guards\/auth\.guard';?\s*/,
      /import\s*{?\s*AuthComponent\s*}?\s*from\s*'\.\/auth\/auth\.component';?\s*/,
      /import\s*{?\s*authRoutes\s*}?\s*from\s*'\.\/auth\/auth\.route';?\s*/
    ];

    importsToRemove.forEach(importRegex => {
      if (content.match(importRegex)) {
        content = content.replace(importRegex, '');
        this.log(`Removed import matching: ${importRegex}`);
      }
    });

    // Remove the auth route using a more comprehensive regex
    const authRouteRegex = /\s*{\s*path:\s*['"]auth['"]\s*,\s*(?:component:\s*AuthComponent\s*,\s*)?(?:loadComponent:\s*\(\)\s*=>\s*import\(['"]\.\/auth\/auth\.component['"]\)\.then\(.*?\)\s*,\s*)?(?:children:\s*authRoutes\s*,\s*)?(?:loadChildren:\s*\(\)\s*=>\s*import\(['"]\.\/auth\/auth\.route['"]\)\.then\(.*?\)\s*,\s*)?},?/;
    
    if (content.match(authRouteRegex)) {
      content = content.replace(authRouteRegex, '');
      this.log('Removed auth route from app.routes.ts');
      this.removedItems.routes.push("path: 'auth'");
    } else {
      this.log('Auth route not found in app.routes.ts');
    }
    
    // Clean up any empty arrays or extra commas
    content = content.replace(/\[\s*,\s*\]/g, '[]');
    content = content.replace(/,\s*\]/g, ']');
    content = content.replace(/,\s*,/g, ',');
    
    // Write the updated content back to the file
    fs.writeFileSync(appRoutesPath, content, 'utf8');
  }
  
  _removeAuthRoutesFromAuthRoute() {
    const authRoutesPath = path.join(process.cwd(), 'frontend/src/app/auth/auth.route.ts');
    
    if (!fs.existsSync(authRoutesPath)) {
      this.log.error(`auth.route.ts not found at: ${authRoutesPath}`);
      return;
    }
    
    let content = fs.readFileSync(authRoutesPath, 'utf8');
    let modified = false;
    
    // Remove each route
    this.routes.forEach(route => {
      if (content.includes(route)) {
        this.log(`Removing ${route} route from auth.route.ts`);
        
        // Find the route
        const routeRegex = new RegExp(`\\s*{\\s*${route}[\\s\\S]*?},`, 'g');
        const routeMatch = content.match(routeRegex);
        
        if (routeMatch) {
          // Remove the route
          content = content.replace(routeMatch[0], '');
          modified = true;
          this.removedItems.routes.push(route);
        } else {
          this.log.error(`Could not find ${route} route in auth.route.ts`);
        }
      } else {
        this.log(`${route} route not found in auth.route.ts`);
      }
    });
    
    // Write the updated content back to the file if modified
    if (modified) {
      // Clean up any double commas that might have been created
      content = content.replace(/,\s*,/g, ',');
      
      // Clean up empty routes array
      content = content.replace(/export const routes: Routes = \[\s*\];/, 'export const routes: Routes = [];');
      
      fs.writeFileSync(authRoutesPath, content, 'utf8');
      this.log('Auth routes updated successfully');
    }
  }
  
  _restoreAuthServicePlaceholder() {
    const authServicePath = path.join(process.cwd(), 'frontend/src/app/services/auth/auth.service.ts');
    
    if (!fs.existsSync(authServicePath)) {
      this.log.error('auth.service.ts not found');
      return;
    }

    try {
      let content = fs.readFileSync(authServicePath, 'utf8');
      
      // Comment out the SignInMutation import
      content = content.replace(
        /import \{ SignInMutation \} from .*/,
        '// import { SignInMutation } from \'src/app/graphql/mutations/auth/signIn.mutation\';'
      );
      
      // First find the signIn method 
      const signInMethodStart = '  signIn(input: any): Observable<any> {';
      const nextMethodStart = '  storeUserData(result: any): Observable<void> {';
      
      const startIndex = content.indexOf(signInMethodStart);
      if (startIndex === -1) {
        this.log.error('Could not find signIn method in auth.service.ts');
        return;
      }
      
      const endIndex = content.indexOf(nextMethodStart, startIndex);
      if (endIndex === -1) {
        this.log.error('Could not find end of signIn method in auth.service.ts');
        return;
      }
      
      // Extract parts of the file
      const beforeMethod = content.substring(0, startIndex);
      const afterMethod = content.substring(endIndex);
      
      // Create the placeholder implementation
      const placeholderImplementation = `  signIn(input: any): Observable<any> {
    // Placeholder implementation - will be replaced by the frontend-auth generator
    console.warn('Auth service not fully implemented yet. Run the frontend-auth generator to enable authentication.');
    return of({ success: false, message: 'Authentication not implemented yet' });

    /* Real implementation will be added by the frontend-auth generator:
    return this.logout().pipe(
      switchMap(() => {
        return this.apollo
          .mutate({
            mutation: SignInMutation,
            variables: {
              email: input.email,
              password: input.password
            }
          })
          .pipe(
            map((response: any) =>  {
              const result = response.data.signIn;
              if (result.errors && result.errors.length > 0) {
                throw this.errorService.validationError(result.errors);
              }
              return result;
            }),
            switchMap(result => this.storeUserData(result))
          );
      })
    );
    */
  }

`;
      
      // Combine the parts
      const newContent = beforeMethod + placeholderImplementation + afterMethod;
      
      // Write the file back
      fs.writeFileSync(authServicePath, newContent, 'utf8');
      this.log('Successfully restored placeholder implementation in auth.service.ts');
    } catch (error) {
      this.log.error(`Error restoring auth.service.ts: ${error.message}`);
    }
  }
  
  end() {
    this.log('Frontend authentication files have been removed successfully.');
    
    // Report what was removed
    this.log('\nSummary of removed items:');
    
    if (this.removedItems.mutations.length > 0) {
      this.log('\nMutation files:');
      this.removedItems.mutations.forEach(mutation => {
        this.log(`- ${mutation}`);
      });
    } else {
      this.log('- No mutation files were removed');
    }
    
    if (this.removedItems.pages.length > 0) {
      this.log('\nPage directories:');
      this.removedItems.pages.forEach(page => {
        this.log(`- ${page}`);
      });
    } else {
      this.log('- No page directories were removed');
    }
    
    if (this.removedItems.routes.length > 0) {
      this.log('\nRoutes:');
      this.removedItems.routes.forEach(route => {
        this.log(`- ${route}`);
      });
    } else {
      this.log('- No routes were removed');
    }
  }
}

module.exports = RemoveFrontendAuthGenerator; 