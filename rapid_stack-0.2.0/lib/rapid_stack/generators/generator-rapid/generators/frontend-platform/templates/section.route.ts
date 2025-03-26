import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '<%= pages[0] %>',
    pathMatch: 'full'
  },
<% pages.forEach(function(page) { %>
  {
    path: '<%= page %>',
    loadComponent: () => import('./pages/<%= page %>/<%= page %>.page').then(m => m.<%= _capitalize(page) %>Page)
  },
<% }); %>
]; 