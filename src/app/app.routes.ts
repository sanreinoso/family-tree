import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home/home.page';
import { MemberCapturePageComponent } from './pages/member-capture/member-capture.page';
import { RelationshipCapturePageComponent } from './pages/relationship-capture/relationship-capture.page';
import { GraphPageComponent } from './pages/graph/graph.page';

export const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'members/new', component: MemberCapturePageComponent },
  { path: 'relationships/new', component: RelationshipCapturePageComponent },
  { path: 'graph', component: GraphPageComponent },
  { path: '**', redirectTo: '' }
];
