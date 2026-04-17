import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './landing.html',
})
export class LandingPage {
    router = inject(Router);
}
