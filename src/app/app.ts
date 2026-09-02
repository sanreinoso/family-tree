import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent {
  protected readonly brand = signal({
    name: 'Family Tree',
    summary: 'Plan every branch with calm clarity.'
  });
  protected readonly currentYear = new Date().getFullYear();
}
