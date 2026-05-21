import { Component, OnInit, inject, signal } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { WelcomeService } from '../services/welcome.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardContent,
    IonSpinner,
    TranslatePipe,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent implements OnInit {
  private readonly welcomeService = inject(WelcomeService);

  readonly message = signal<string | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.welcomeService.getMessage().subscribe({
      next: msg => {
        this.message.set(msg);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }
}
