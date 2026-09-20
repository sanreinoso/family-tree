import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePageComponent)
  },
  {
    path: 'members/new',
    loadComponent: () =>
      import('./pages/member-capture/member-capture.page').then((m) => m.MemberCapturePageComponent)
  },
  {
    path: 'relationships/new',
    loadComponent: () =>
      import('./pages/relationship-capture/relationship-capture.page').then(
        (m) => m.RelationshipCapturePageComponent
      )
  },
  {
    path: 'graph',
    loadComponent: () => import('./pages/graph/graph.page').then((m) => m.GraphPageComponent)
  },
  { path: '**', redirectTo: '' }
];
