import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { Logo } from '../../../shared/ui/logo';
import { AuthService } from '../../../core/auth/auth.service';
import { Button, Icon } from '../../../shared/ui';

@Component({
  selector: 'app-login',
  imports: [Logo, FormsModule, Button, Icon],
  templateUrl: './login.html',
  host: { class: 'block' },
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.loading() || !this.email() || !this.password()) return;

    this.loading.set(true);
    this.error.set(null);
    try {
      await this.auth.signIn(this.email().trim(), this.password());
      const returnUrl =
        this.route.snapshot.queryParamMap.get('returnUrl') ?? '/influencers';
      await this.router.navigateByUrl(returnUrl);
    } catch (err) {
      this.error.set(
        err instanceof Error && err.message
          ? err.message
          : 'Invalid credentials. Please try again.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
