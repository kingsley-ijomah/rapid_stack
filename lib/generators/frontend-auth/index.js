const Generator = require('yeoman-generator');
const path = require('path');
const fs = require('fs');
const { handlePrompt } = require('../../lib/utils');

class FrontendAuthGenerator extends Generator {
  constructor(args, opts) {
    super(args, opts);
    
    // Add force option
    this.option('force', {
      type: Boolean,
      description: 'Force overwrite files without confirmation',
      default: true
    });
    
    // Fixed values for folder name and destination path
    this.backendMutationsPath = 'backend/app/graphql/mutations/user_mutations';
    this.frontendMutationsPath = 'frontend/src/app/graphql/mutations/auth';
    this.userModelPath = 'backend/app/models/user.rb';
    this.frontendPagesPath = 'frontend/src/app/auth/pages';
    this.frontendAuthPath = 'frontend/src/app/auth';
    
    // List of mutation files to create
    this.mutations = [
      { 
        name: 'signIn', 
        backendFile: 'sign_in.rb',
        templateFile: 'signIn.mutation.ts.ejs'
      },
      { 
        name: 'createUser', 
        backendFile: 'create_user.rb',
        templateFile: 'createUser.mutation.ts.ejs'
      },
      { 
        name: 'logout', 
        backendFile: 'logout.rb',
        templateFile: 'logout.mutation.ts.ejs'
      },
      { 
        name: 'passwordReset', 
        backendFile: 'password_reset.rb',
        templateFile: 'passwordReset.mutation.ts.ejs'
      },
      { 
        name: 'updatePassword', 
        backendFile: 'update_password.rb',
        templateFile: 'updatePassword.mutation.ts.ejs'
      },
      { 
        name: 'otpRequest', 
        backendFile: 'otp_request.rb',
        templateFile: 'otpRequest.mutation.ts.ejs'
      },
      { 
        name: 'updateUser', 
        backendFile: 'update_user.rb',
        templateFile: 'updateUser.mutation.ts.ejs'
      },
      {
        name: 'twoFactorSetup',
        backendFile: 'setup_two_factor.rb',
        templateFile: 'twoFactorSetup.mutation.ts.ejs'
      },
      {
        name: 'verifyTwoFactorSetup',
        backendFile: 'setup_two_factor.rb',
        templateFile: 'verifyTwoFactorSetup.mutation.ts.ejs'
      }
    ];
    
    // List of pages to create
    this.pages = [
      {
        name: 'signup',
        mutationName: 'createUser'
      },
      {
        name: 'login',
        mutationName: 'signIn'
      },
      {
        name: 'forgot-password',
        mutationName: 'otpRequest'
      },
      {
        name: 'verify-otp',
        mutationName: 'passwordReset'
      },
      {
        name: 'update-user',
        mutationName: 'updateUser'
      },
      {
        name: 'update-password',
        mutationName: 'updatePassword'
      },
      {
        name: 'two-factor-setup',
        mutationName: 'twoFactorSetup'
      },
      {
        name: 'two-factor-verify',
        mutationName: 'verifyTwoFactorSetup'
      }
    ];
    
    // Fields to exclude from the response data
    this.excludedResponseFields = [
      'encrypted_password',
      'reset_password_token',
      'reset_password_sent_at',
      'remember_created_at',
      'reset_password_token_expires_at',
      'role',
      'created_at',
      'updated_at',
      '_id',
      'password',
      'password_confirmation'
    ];
  }

  initializing() {
    this.log('This generator will create frontend GraphQL mutation files for authentication.');
    
    if (this.options.force) {
      this.log('Force mode enabled - files will be overwritten without confirmation');
    }
  }

  async prompting() {
    this.answers = await handlePrompt(this, [
      {
        type: 'confirm',
        name: 'includeSignIn',
        message: 'Include sign in mutation?',
        default: true
      },
      {
        type: 'confirm',
        name: 'includeCreateUser',
        message: 'Include create user mutation?',
        default: true
      },
      {
        type: 'confirm',
        name: 'includeLogout',
        message: 'Include logout mutation?',
        default: true
      },
      {
        type: 'confirm',
        name: 'includePasswordReset',
        message: 'Include password reset mutation?',
        default: true
      },
      {
        type: 'confirm',
        name: 'includeUpdatePassword',
        message: 'Include update password mutation?',
        default: true
      },
      {
        type: 'confirm',
        name: 'includeOtpRequest',
        message: 'Include OTP request mutation?',
        default: true
      },
      {
        type: 'confirm',
        name: 'includeUpdateUser',
        message: 'Include update user mutation?',
        default: true
      },
      {
        type: 'confirm',
        name: 'includePages',
        message: 'Include auth pages?',
        default: true
      },
      {
        type: 'confirm',
        name: 'includeTwoFactorSetup',
        message: 'Include two-factor setup mutation?',
        default: true
      },
      {
        type: 'confirm',
        name: 'includeVerifyTwoFactorSetup',
        message: 'Include verify two-factor setup mutation?',
        default: true
      }
    ]);
  }

  writing() {
    // Create the destination directory if it doesn't exist
    const destPath = path.join(process.cwd(), this.frontendMutationsPath);
    if (!fs.existsSync(destPath)) {
      this.log(`Creating directory: ${destPath}`);
      fs.mkdirSync(destPath, { recursive: true });
    }

    // Create the auth directory if it doesn't exist
    const authPath = path.join(process.cwd(), this.frontendAuthPath);
    if (!fs.existsSync(authPath)) {
      this.log(`Creating directory: ${authPath}`);
      fs.mkdirSync(authPath, { recursive: true });
    }

    // Note: We don't create the auth services directory anymore since we're using the one from services/auth

    // Create the auth guards directory if it doesn't exist
    const authGuardsPath = path.join(process.cwd(), this.frontendAuthPath, 'guards');
    if (!fs.existsSync(authGuardsPath)) {
      this.log(`Creating directory: ${authGuardsPath}`);
      fs.mkdirSync(authGuardsPath, { recursive: true });
    }

    // Create auth.route.ts if it doesn't exist
    const authRoutePath = path.join(authPath, 'auth.route.ts');
    if (!fs.existsSync(authRoutePath)) {
      this.log('Creating auth.route.ts');
      const routeContent = `import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'signup',
    loadComponent: () => import('./pages/signup/signup.page').then(m => m.SignupPage)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./pages/forgot-password/forgot-password.page').then(m => m.ForgotPasswordPage)
  },
  {
    path: 'verify-otp',
    loadComponent: () => import('./pages/verify-otp/verify-otp.page').then(m => m.VerifyOtpPage)
  },
  {
    path: 'setup-2fa',
    loadComponent: () => import('./pages/two-factor-setup/two-factor-setup.page').then(m => m.TwoFactorSetupPage),
    title: 'Setup 2FA'
  },
  {
    path: 'verify-2fa',
    loadComponent: () => import('./pages/two-factor-verify/two-factor-verify.page').then(m => m.TwoFactorVerifyPage),
    title: 'Verify 2FA'
  }
];`;
      fs.writeFileSync(authRoutePath, routeContent);
    }

    // Create auth.component.ts if it doesn't exist
    const authComponentPath = path.join(authPath, 'auth.component.ts');
    if (!fs.existsSync(authComponentPath)) {
      this.log('Creating auth.component.ts');
      const componentContent = `import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IonRouterOutlet } from '@ionic/angular/standalone';

@Component({
  selector: 'app-auth',
  template: '<ion-router-outlet></ion-router-outlet>',
  standalone: true,
  imports: [RouterOutlet, IonRouterOutlet]
})
export class AuthComponent {}`;
      fs.writeFileSync(authComponentPath, componentContent);
    }

    // Create auth.guard.ts if it doesn't exist
    const authGuardPath = path.join(authGuardsPath, 'auth.guard.ts');
    if (!fs.existsSync(authGuardPath)) {
      this.log('Creating auth.guard.ts');
      const guardContent = `import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from 'src/app/services/auth/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated().pipe(
    map(isAuthenticated => {
      if (isAuthenticated) {
        return true;
      }
      
      return router.createUrlTree(['/auth/login']);
    })
  );
};`;
      fs.writeFileSync(authGuardPath, guardContent);
    }

    // Get user model fields for response data
    const responseFields = this._getUserModelFields();

    // Generate the selected mutation files
    this._generateMutationFiles(responseFields);

    // Generate the auth pages if selected
    if (this.answers.includePages) {
      this._generateAuthPages();
    }
    
    // Update app.routes.ts to include auth route if it doesn't exist
    this._updateAppRoutes();
    
    // Update auth.route.ts to include update-user and update-password routes if they don't exist
    this._updateAuthRoutes();

    // Update auth.service.ts with real implementation
    this._updateAuthService();
  }

  _generateMutationFiles(responseFields) {
    this.mutations.forEach(mutation => {
      const includeKey = `include${mutation.name.charAt(0).toUpperCase() + mutation.name.slice(1)}`;
      
      if (this.answers[includeKey]) {
        this.log(`Generating ${mutation.name}.mutation.ts`);
        
        // Get arguments from backend file
        const args = this._getArgumentsFromBackendFile(mutation.backendFile);
        
        // Generate the frontend mutation file
        this.fs.copyTpl(
          this.templatePath(mutation.templateFile),
          path.join(process.cwd(), this.frontendMutationsPath, `${mutation.name}.mutation.ts`),
          {
            mutationName: mutation.name,
            args: args,
            responseFields: responseFields,
            // Special case for signIn which needs token in response
            includeToken: mutation.name === 'signIn'
          },
          {},
          { force: this.options.force }
        );
      }
    });
  }

  _generateAuthPages() {
    // Create the pages directory if it doesn't exist
    const pagesPath = path.join(process.cwd(), this.frontendPagesPath);
    if (!fs.existsSync(pagesPath)) {
      this.log(`Creating directory: ${pagesPath}`);
      fs.mkdirSync(pagesPath, { recursive: true });
    }

    // Generate each page
    this.pages.forEach(page => {
      // Check if we should include pages and if the corresponding mutation is included
      const mutationKey = `include${page.mutationName.charAt(0).toUpperCase() + page.mutationName.slice(1)}`;
      
      if (this.answers.includePages && this.answers[mutationKey]) {
        this.log(`Generating ${page.name} page`);
        
        // Create the page directory
        const pageDir = path.join(pagesPath, page.name);
        if (!fs.existsSync(pageDir)) {
          fs.mkdirSync(pageDir, { recursive: true });
        }
        
        // Get the mutation arguments
        const mutation = this.mutations.find(m => m.name === page.mutationName);
        const args = mutation ? this._getArgumentsFromBackendFile(mutation.backendFile) : [];
        
        // Generate the page files from templates
        this._generatePageFiles(page, args);
      }
    });
  }

  _generatePageFiles(page, args) {
    const destDir = path.join(process.cwd(), this.frontendPagesPath, page.name);
    
    // Generate TypeScript file
    this.fs.copyTpl(
      this.templatePath(`pages/${page.name}/${page.name}.page.ts.ejs`),
      path.join(destDir, `${page.name}.page.ts`),
      {
        args: args,
        snakeToCamel: this._snakeToCamel.bind(this)
      },
      {},
      { force: this.options.force }
    );
    
    // Generate HTML file
    this.fs.copyTpl(
      this.templatePath(`pages/${page.name}/${page.name}.page.html.ejs`),
      path.join(destDir, `${page.name}.page.html`),
      {
        args: args,
        snakeToCamel: this._snakeToCamel.bind(this),
        formatFieldName: this._formatFieldName.bind(this)
      },
      {},
      { force: this.options.force }
    );
    
    // Generate SCSS file
    this.fs.copyTpl(
      this.templatePath(`pages/${page.name}/${page.name}.page.scss.ejs`),
      path.join(destDir, `${page.name}.page.scss`),
      {},
      {},
      { force: this.options.force }
    );
  }

  _getArgumentsFromBackendFile(filename) {
    const filePath = path.join(process.cwd(), this.backendMutationsPath, filename);
    
    if (!fs.existsSync(filePath)) {
      this.log.error(`Backend file not found: ${filePath}`);
      return [];
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const args = [];
    
    // Extract arguments using regex
    const argRegex = /argument\s+:(\w+),\s+(\w+),\s+required:\s+(true|false)/g;
    let match;
    
    while ((match = argRegex.exec(content)) !== null) {
      args.push({
        name: match[1],
        type: this._convertRubyTypeToGraphQL(match[2]),
        required: match[3] === 'true'
      });
    }
    
    return args;
  }

  _getUserModelFields() {
    const userModelPath = path.join(process.cwd(), this.userModelPath);
    
    if (!fs.existsSync(userModelPath)) {
      this.log.error(`User model not found at: ${userModelPath}`);
      return ['id', 'fullName', 'email', 'telephone', 'role']; // Default fields if model not found
    }
    
    const content = fs.readFileSync(userModelPath, 'utf8');
    const fields = ['id']; // Always include id
    
    // Extract field definitions using regex
    const fieldRegex = /field\s+:(\w+),\s+type:\s+(\w+)(?:,\s+default:\s+([^,\n]+))?/g;
    let match;
    
    while ((match = fieldRegex.exec(content)) !== null) {
      const fieldName = match[1];
      
      // Skip excluded fields
      if (!this.excludedResponseFields.includes(fieldName)) {
        // Convert snake_case to camelCase for frontend
        const camelCaseField = this._snakeToCamel(fieldName);
        
        // Add field if not already included
        if (!fields.includes(camelCaseField)) {
          fields.push(camelCaseField);
        }
      }
    }
    
    return fields;
  }

  _convertRubyTypeToGraphQL(rubyType) {
    const typeMap = {
      'String': 'String',
      'Integer': 'Int',
      'Float': 'Float',
      'Boolean': 'Boolean',
      'Time': 'String',
      'Date': 'String',
      'DateTime': 'String',
      'Hash': 'JSON',
      'Array': 'JSON'
    };

    return typeMap[rubyType] || 'String';
  }

  _snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (match, group1) => group1.toUpperCase());
  }

  _snakeToPascal(str) {
    return str
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  _formatFieldName(camelCase) {
    // Convert camelCase to Title Case with spaces
    return camelCase
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }

  _updateAppRoutes() {
    const appRoutesPath = path.join(process.cwd(), 'frontend/src/app/app.routes.ts');
    
    if (!fs.existsSync(appRoutesPath)) {
      this.log.error(`app.routes.ts not found at: ${appRoutesPath}`);
      return;
    }
    
    let content = fs.readFileSync(appRoutesPath, 'utf8');
    
    // Update authGuard import path
    if (content.includes("import { authGuard } from './platforms/auth/guards/auth.guard';")) {
      content = content.replace(
        "import { authGuard } from './platforms/auth/guards/auth.guard';",
        "import { authGuard } from './auth/guards/auth.guard';"
      );
      fs.writeFileSync(appRoutesPath, content, 'utf8');
      this.log('Updated authGuard import path in app.routes.ts');
    }
    
    // Check if auth route already exists
    if (!content.includes("path: 'auth'")) {
      this.log('Adding auth route to app.routes.ts');
      
      // Find the routes array
      const routesStartMatch = content.match(/export const routes: Routes = \[/);
      
      if (routesStartMatch) {
        const routesStartIndex = routesStartMatch.index + routesStartMatch[0].length;
        
        // Auth route to insert with updated path (no platforms)
        const authRoute = `
  {
    path: 'auth',
    loadComponent: () => import('./auth/auth.component').then(m => m.AuthComponent),
    loadChildren: () => import('./auth/auth.route').then(m => m.routes),
  },`;
        
        // Insert the auth route after the opening bracket of the routes array
        content = content.slice(0, routesStartIndex) + authRoute + content.slice(routesStartIndex);
        
        fs.writeFileSync(appRoutesPath, content, 'utf8');
        
        this.log('Auth route added to app.routes.ts');
      } else {
        this.log.error('Could not find routes array in app.routes.ts');
      }
    } else {
      // If auth route exists but uses old path, update it
      const oldRoutePath = /loadComponent:\s*\(\)\s*=>\s*import\(['"]\.\/platforms\/auth\/auth\.component['"]\)/;
      if (oldRoutePath.test(content)) {
        content = content.replace(
          oldRoutePath,
          "loadComponent: () => import('./auth/auth.component')"
        );
        
        const oldChildrenPath = /loadChildren:\s*\(\)\s*=>\s*import\(['"]\.\/platforms\/auth\/auth\.route['"]\)/;
        if (oldChildrenPath.test(content)) {
          content = content.replace(
            oldChildrenPath,
            "loadChildren: () => import('./auth/auth.route')"
          );
          
          fs.writeFileSync(appRoutesPath, content, 'utf8');
          this.log('Updated existing auth route paths in app.routes.ts');
        }
      } else {
        this.log('Auth route already exists in app.routes.ts with correct paths');
      }
    }
  }

  _updateAuthRoutes() {
    const authRoutesPath = path.join(process.cwd(), 'frontend/src/app/auth/auth.route.ts');
    
    if (!fs.existsSync(authRoutesPath)) {
      this.log.error(`auth.route.ts not found at: ${authRoutesPath}`);
      return;
    }
    
    let content = fs.readFileSync(authRoutesPath, 'utf8');
    let modified = false;
    
    // Check if update-user route already exists
    if (!content.includes("path: 'update-user'")) {
      this.log('Adding update-user route to auth.route.ts');
      
      // Find the routes array
      const routesMatch = content.match(/export const routes: Routes = \[/);
      
      if (routesMatch) {
        const routesStartIndex = routesMatch.index + routesMatch[0].length;
        
        // Update-user route to insert
        const updateUserRoute = `
  {
    path: 'update-user',
    loadComponent: () => import('./pages/update-user/update-user.page').then(m => m.UpdateUserPage),
    canActivate: [authGuard]
  },`;
        
        // Insert the update-user route at the beginning of the routes array
        // Check first if this is a newly created file
        if (content.includes("loadComponent: () => import('./pages/forgot-password/forgot-password.page')")) {
          // Insert after forgot-password route
          const forgotPasswordMatch = content.match(/path:\s*'forgot-password'[\s\S]*?\},/);
          if (forgotPasswordMatch) {
            const insertionIndex = forgotPasswordMatch.index + forgotPasswordMatch[0].length;
            content = content.slice(0, insertionIndex) + updateUserRoute + content.slice(insertionIndex);
            modified = true;
          } else {
            content = content.slice(0, routesStartIndex) + updateUserRoute + content.slice(routesStartIndex);
            modified = true;
          }
        } else {
          content = content.slice(0, routesStartIndex) + updateUserRoute + content.slice(routesStartIndex);
          modified = true;
        }
      } else {
        this.log.error('Could not find routes array in auth.route.ts');
      }
    } else {
      this.log('Update-user route already exists in auth.route.ts');
    }
    
    // Check if update-password route already exists
    if (!content.includes("path: 'update-password'")) {
      this.log('Adding update-password route to auth.route.ts');
      
      // Find the routes array
      const routesMatch = content.match(/export const routes: Routes = \[/);
      
      if (routesMatch) {
        const routesStartIndex = routesMatch.index + routesMatch[0].length;
        
        // Update-password route to insert
        const updatePasswordRoute = `
  {
    path: 'update-password',
    loadComponent: () => import('./pages/update-password/update-password.page').then(m => m.UpdatePasswordPage),
    canActivate: [authGuard]
  },`;
        
        // Insert the update-password route
        // If update-user was just added, we need to insert after it
        if (content.includes("path: 'update-user'")) {
          const updateUserMatch = content.match(/path:\s*'update-user'[\s\S]*?\},/);
          if (updateUserMatch) {
            const insertionIndex = updateUserMatch.index + updateUserMatch[0].length;
            content = content.slice(0, insertionIndex) + updatePasswordRoute + content.slice(insertionIndex);
            modified = true;
          } else {
            content = content.slice(0, routesStartIndex) + updatePasswordRoute + content.slice(routesStartIndex);
            modified = true;
          }
        } else {
          content = content.slice(0, routesStartIndex) + updatePasswordRoute + content.slice(routesStartIndex);
          modified = true;
        }
      } else {
        this.log.error('Could not find routes array in auth.route.ts');
      }
    } else {
      this.log('Update-password route already exists in auth.route.ts');
    }
    
    // Check if login route already exists
    if (!content.includes("path: 'login'")) {
      this.log('Adding login route to auth.route.ts');
      
      // Find the routes array
      const routesMatch = content.match(/export const routes: Routes = \[/);
      
      if (routesMatch) {
        const routesStartIndex = routesMatch.index + routesMatch[0].length;
        
        // Login route to insert
        const loginRoute = `
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },`;
        
        // Insert the login route
        content = content.slice(0, routesStartIndex) + loginRoute + content.slice(routesStartIndex);
        modified = true;
      } else {
        this.log.error('Could not find routes array in auth.route.ts');
      }
    } else {
      this.log('Login route already exists in auth.route.ts');
    }
    
    // Check if signup route already exists
    if (!content.includes("path: 'signup'")) {
      this.log('Adding signup route to auth.route.ts');
      
      // Find the routes array
      const routesMatch = content.match(/export const routes: Routes = \[/);
      
      if (routesMatch) {
        const routesStartIndex = routesMatch.index + routesMatch[0].length;
        
        // Signup route to insert
        const signupRoute = `
  {
    path: 'signup',
    loadComponent: () => import('./pages/signup/signup.page').then(m => m.SignupPage)
  },`;
        
        // Insert the signup route
        if (content.includes("path: 'login'")) {
          const loginMatch = content.match(/path:\s*'login'[\s\S]*?\},/);
          if (loginMatch) {
            const insertionIndex = loginMatch.index + loginMatch[0].length;
            content = content.slice(0, insertionIndex) + signupRoute + content.slice(insertionIndex);
            modified = true;
          } else {
            content = content.slice(0, routesStartIndex) + signupRoute + content.slice(routesStartIndex);
            modified = true;
          }
        } else {
          content = content.slice(0, routesStartIndex) + signupRoute + content.slice(routesStartIndex);
          modified = true;
        }
      } else {
        this.log.error('Could not find routes array in auth.route.ts');
      }
    } else {
      this.log('Signup route already exists in auth.route.ts');
    }
    
    // Check if forgot-password route already exists
    if (!content.includes("path: 'forgot-password'")) {
      this.log('Adding forgot-password route to auth.route.ts');
      
      // Find the routes array
      const routesMatch = content.match(/export const routes: Routes = \[/);
      
      if (routesMatch) {
        const routesStartIndex = routesMatch.index + routesMatch[0].length;
        
        // Forgot-password route to insert
        const forgotPasswordRoute = `
  {
    path: 'forgot-password',
    loadComponent: () => import('./pages/forgot-password/forgot-password.page').then(m => m.ForgotPasswordPage)
  },`;
        
        // Insert the forgot-password route
        if (content.includes("path: 'signup'")) {
          const signupMatch = content.match(/path:\s*'signup'[\s\S]*?\},/);
          if (signupMatch) {
            const insertionIndex = signupMatch.index + signupMatch[0].length;
            content = content.slice(0, insertionIndex) + forgotPasswordRoute + content.slice(insertionIndex);
            modified = true;
          } else {
            content = content.slice(0, routesStartIndex) + forgotPasswordRoute + content.slice(routesStartIndex);
            modified = true;
          }
        } else {
          content = content.slice(0, routesStartIndex) + forgotPasswordRoute + content.slice(routesStartIndex);
          modified = true;
        }
      } else {
        this.log.error('Could not find routes array in auth.route.ts');
      }
    } else {
      this.log('Forgot-password route already exists in auth.route.ts');
    }
    
    // Check if verify-otp route already exists
    if (!content.includes("path: 'verify-otp'")) {
      this.log('Adding verify-otp route to auth.route.ts');
      
      // Find the routes array
      const routesMatch = content.match(/export const routes: Routes = \[/);
      
      if (routesMatch) {
        const routesStartIndex = routesMatch.index + routesMatch[0].length;
        
        // Verify-otp route to insert
        const verifyOtpRoute = `
  {
    path: 'verify-otp',
    loadComponent: () => import('./pages/verify-otp/verify-otp.page').then(m => m.VerifyOtpPage)
  },`;
        
        // Insert the verify-otp route - look for forgot-password route first
        if (content.includes("path: 'forgot-password'")) {
          const forgotPasswordMatch = content.match(/path:\s*'forgot-password'[\s\S]*?\},/);
          if (forgotPasswordMatch) {
            const insertionIndex = forgotPasswordMatch.index + forgotPasswordMatch[0].length;
            content = content.slice(0, insertionIndex) + verifyOtpRoute + content.slice(insertionIndex);
            modified = true;
          } else {
            // If we can't find forgot-password route match with regex, try a more precise approach
            const forgotPasswordStr = "path: 'forgot-password'";
            const forgotIndex = content.indexOf(forgotPasswordStr);
            if (forgotIndex !== -1) {
              // Find the closing brace of this route
              const routeClosingIndex = content.indexOf("}", forgotIndex);
              if (routeClosingIndex !== -1) {
                // Check if there's already a comma after the closing brace
                const afterClosingBrace = content.substring(routeClosingIndex + 1, routeClosingIndex + 5).trim();
                // If there's no comma, add one
                if (!afterClosingBrace.startsWith(',')) {
                  // Insert after the closing brace with a comma
                  content = content.slice(0, routeClosingIndex + 1) + "," + verifyOtpRoute + content.slice(routeClosingIndex + 1);
                } else {
                  // Comma already exists, just insert after it
                  content = content.slice(0, routeClosingIndex + 2) + verifyOtpRoute + content.slice(routeClosingIndex + 2);
                }
                modified = true;
              } else {
                // Fallback: Add it just before the closing bracket of the routes array
                const closingBracketIndex = content.lastIndexOf('];');
                if (closingBracketIndex !== -1) {
                  content = content.slice(0, closingBracketIndex) + verifyOtpRoute + content.slice(closingBracketIndex);
                  modified = true;
                }
              }
            } else {
              // Fallback: Add it just before the closing bracket of the routes array
              const closingBracketIndex = content.lastIndexOf('];');
              if (closingBracketIndex !== -1) {
                content = content.slice(0, closingBracketIndex) + verifyOtpRoute + content.slice(closingBracketIndex);
                modified = true;
              }
            }
          }
        } else {
          // If forgot-password route doesn't exist, add after whatever route is last
          // Try to find the last route in the array
          const closingBracketIndex = content.lastIndexOf('];');
          if (closingBracketIndex !== -1) {
            // Check if there's at least one route already in the array
            const lastRouteMatch = content.substring(0, closingBracketIndex).match(/\{\s*path:\s*['"].*?['"]\s*,[\s\S]*?\},\s*$/);
            if (lastRouteMatch) {
              const insertionIndex = lastRouteMatch.index + lastRouteMatch[0].length;
              content = content.slice(0, insertionIndex) + verifyOtpRoute + content.slice(insertionIndex);
              modified = true;
            } else {
              // If no route exists, just add before the closing bracket
              content = content.slice(0, closingBracketIndex) + verifyOtpRoute + content.slice(closingBracketIndex);
              modified = true;
            }
          } else {
            this.log.error('Could not find a suitable insertion point for verify-otp route in auth.route.ts');
          }
        }
      } else {
        this.log.error('Could not find routes array in auth.route.ts');
      }
    } else {
      this.log('Verify-otp route already exists in auth.route.ts');
    }
    
    // Write the updated content back to the file if modified
    if (modified) {
      // Check if authGuard is imported
      if (!content.includes('import { authGuard }')) {
        // Add import for authGuard if not already present
        // Check if the import is from 'src/app/auth/guards/auth.guard' or '../guards/auth.guard'
        if (content.includes("from 'src/app/auth/guards/auth.guard'")) {
          // Import already exists with full path
        } else if (content.includes("from '../guards/auth.guard'")) {
          // Import already exists with relative path
        } else {
          // Add the import with the same path format as existing imports
          if (content.includes("from 'src/app")) {
            // Use full path format
            const importStatement = "import { authGuard } from 'src/app/auth/guards/auth.guard';\n";
            content = importStatement + content;
          } else {
            // Use relative path format
            const importStatement = "import { authGuard } from '../guards/auth.guard';\n";
            content = importStatement + content;
          }
        }
      }
      
      fs.writeFileSync(authRoutesPath, content, 'utf8');
      this.log('Auth routes updated successfully');
    }
  }

  _updateAuthService() {
    const authServicePath = path.join(process.cwd(), 'frontend/src/app/services/auth/auth.service.ts');
    
    if (!fs.existsSync(authServicePath)) {
      this.log.error('auth.service.ts not found');
      return;
    }

    try {
      let content = fs.readFileSync(authServicePath, 'utf8');
      
      // Uncomment the SignInMutation import
      content = content.replace(
        /\/\/ import \{ SignInMutation \} from/,
        'import { SignInMutation } from'
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
      
      // Create the real implementation
      const realImplementation = `  signIn(input: any): Observable<any> {
    // Real implementation added by frontend-auth generator
    // First logout to clear any stale data
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
  }

`;
      
      // Combine the parts
      const newContent = beforeMethod + realImplementation + afterMethod;
      
      // Write the file back
      fs.writeFileSync(authServicePath, newContent, 'utf8');
      this.log('Successfully updated auth.service.ts with real implementation');
    } catch (error) {
      this.log.error(`Error updating auth.service.ts: ${error.message}`);
    }
  }

  end() {
    this.log('Frontend authentication files have been created successfully.');
  }

  _generateAuthMutations() {
    const mutations = [
      {
        name: 'signIn',
        template: 'sign_in.mutation.ts.ejs',
        output: 'sign_in.mutation.ts'
      },
      {
        name: 'signUp',
        template: 'sign_up.mutation.ts.ejs',
        output: 'sign_up.mutation.ts'
      },
      {
        name: 'logout',
        template: 'logout.mutation.ts.ejs',
        output: 'logout.mutation.ts'
      },
      {
        name: 'passwordReset',
        template: 'password_reset.mutation.ts.ejs',
        output: 'password_reset.mutation.ts'
      },
      {
        name: 'updatePassword',
        template: 'update_password.mutation.ts.ejs',
        output: 'update_password.mutation.ts'
      },
      {
        name: 'otpRequest',
        template: 'otp_request.mutation.ts.ejs',
        output: 'otp_request.mutation.ts'
      },
      {
        name: 'twoFactorSetup',
        template: 'twoFactorSetup.mutation.ts.ejs',
        output: 'two_factor_setup.mutation.ts'
      }
    ];

    mutations.forEach(mutation => {
      this.fs.copyTpl(
        this.templatePath('mutations', mutation.template),
        this.destinationPath('src/app/graphql/mutations/auth', mutation.output),
        {
          mutationName: mutation.name
        }
      );
    });
  }
}

module.exports = FrontendAuthGenerator; 