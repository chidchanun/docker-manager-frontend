import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ApiError } from '../../core/models/auth.model';
import { DockerService } from '../../core/services/docker.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-container-logs',
  imports: [RouterLink],
  templateUrl: './container-logs.html',
  styleUrl: './container-logs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContainerLogsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dockerService = inject(DockerService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly containerID = this.route.snapshot.paramMap.get('id') ?? '';
  readonly containerName = signal('');
  readonly logs = signal('');
  readonly tail = signal(200);
  readonly timestamps = signal(true);
  readonly autoRefresh = signal(true);
  readonly loading = signal(true);
  readonly truncated = signal(false);
  readonly errorMessage = signal('');
  readonly copied = signal(false);

  constructor() {
    this.loadLogs();
    const timer = window.setInterval(() => {
      if (this.autoRefresh() && !this.loading()) this.loadLogs(false);
    }, 5000);
    this.destroyRef.onDestroy(() => window.clearInterval(timer));
  }

  refresh(): void { this.loadLogs(); }

  updateTail(event: Event): void {
    this.tail.set(Number((event.target as HTMLSelectElement).value));
    this.loadLogs();
  }

  toggleTimestamps(event: Event): void {
    this.timestamps.set((event.target as HTMLInputElement).checked);
    this.loadLogs();
  }

  toggleAutoRefresh(event: Event): void {
    this.autoRefresh.set((event.target as HTMLInputElement).checked);
  }

  async copyLogs(): Promise<void> {
    await navigator.clipboard.writeText(this.logs());
    this.copied.set(true);
    window.setTimeout(() => this.copied.set(false), 1500);
  }

  downloadLogs(): void {
    const blob = new Blob([this.logs()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.containerName() || this.containerID}-logs.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private loadLogs(showLoading = true): void {
    if (!this.containerID) { void this.router.navigateByUrl('/dashboard'); return; }
    if (showLoading) this.loading.set(true);
    this.errorMessage.set('');
    this.dockerService.getContainerLogs(this.containerID, this.tail(), this.timestamps())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.containerName.set(response.name);
          this.logs.set(response.logs.replace(/\x1b\[[0-9;]*m/g, ''));
          this.truncated.set(response.truncated);
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 401) {
            this.authService.clearSession();
            void this.router.navigateByUrl('/login');
            return;
          }
          const body = error.error as Partial<ApiError> | null;
          this.errorMessage.set(body?.error ?? 'ไม่สามารถอ่าน Container logs ได้');
        },
      });
  }
}
