import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ContainerDetailResponse } from '../../core/models/docker.model';
import { AuthService } from '../../core/services/auth.service';
import { DockerService } from '../../core/services/docker.service';

@Component({
  selector: 'app-container-detail',
  imports: [RouterLink],
  templateUrl: './container-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContainerDetailComponent {
  private readonly docker = inject(DockerService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  readonly detail = signal<ContainerDetailResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  constructor() {
    this.load();
  }
  displayCommand(item: ContainerDetailResponse): string {
    const values = [...item.config.entrypoint, ...item.config.command];
    const secretFlags = new Set(['--token', '--password', '--secret', '--api-key', '--apikey']);
    return values
      .map((value, index) => {
        const previous = values[index - 1]?.toLowerCase();
        if (previous && secretFlags.has(previous)) return '••••••••';
        const match = value.match(/^(--(?:token|password|secret|api-key|apikey))=(.*)$/i);
        return match ? `${match[1]}=••••••••` : value;
      })
      .join(' ');
  }
  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.docker
      .getContainerDetail(this.id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (value) => this.detail.set(value),
        error: (err: HttpErrorResponse) => {
          if (err.status === 401) {
            this.auth.clearSession();
            void this.router.navigateByUrl('/login');
          } else this.error.set(err.error?.error ?? 'ไม่สามารถอ่านข้อมูล Container ได้');
        },
      });
  }
}
