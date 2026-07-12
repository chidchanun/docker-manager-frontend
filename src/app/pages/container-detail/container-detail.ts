import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ContainerDetailResponse, DockerInfoResponse } from '../../core/models/docker.model';
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
  readonly savingPolicy = signal(false);
  readonly policyMessage = signal('');
  readonly policyConfirmation = signal(false);
  readonly restartPolicy = signal('no');
  readonly retryCount = signal(0);
  readonly cpuLimit = signal(0);
  readonly memoryLimitMB = signal(0);
  readonly pidsLimit = signal(-1);
  readonly dockerInfo = signal<DockerInfoResponse | null>(null);
  readonly policyValidation = computed(() => {
    const errors: string[] = [];
    const info = this.dockerInfo();
    if (this.cpuLimit() < 0) errors.push('CPU ต้องไม่น้อยกว่า 0');
    if (info && this.cpuLimit() > info.cpus) errors.push(`CPU ต้องไม่เกิน ${info.cpus} cores`);
    if (this.memoryLimitMB() < 0) errors.push('Memory ต้องไม่น้อยกว่า 0');
    if (info && this.memoryLimitMB() * 1024 * 1024 > info.memory_bytes) errors.push(`Memory ต้องไม่เกิน ${info.memory_human}`);
    if (this.pidsLimit() < -1) errors.push('PIDs ต้องเป็น -1, 0 หรือค่าบวก');
    if (this.retryCount() < 0) errors.push('Max retries ต้องไม่น้อยกว่า 0');
    return errors;
  });
  constructor() {
    this.load();
    this.docker.getInfo().subscribe({ next: (info) => this.dockerInfo.set(info) });
  }
  displayCommand(item: ContainerDetailResponse): string {
    const values = [
      ...(item.config.entrypoint ?? []),
      ...(item.config.command ?? []),
    ];
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
        next: (value) => {
          this.detail.set(value);
          this.restartPolicy.set(value.host_config.restart_policy || 'no');
          this.retryCount.set(value.host_config.maximum_restart_retries ?? 0);
          this.cpuLimit.set(value.host_config.nano_cpus / 1e9);
          this.memoryLimitMB.set(Math.round(value.host_config.memory_bytes / 1024 / 1024));
          this.pidsLimit.set(value.host_config.pids_limit ?? -1);
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 401) {
            this.auth.clearSession();
            void this.router.navigateByUrl('/login');
          } else this.error.set(err.error?.error ?? 'ไม่สามารถอ่านข้อมูล Container ได้');
        },
      });
  }
  updateNumber(event: Event, target: 'retry'|'cpu'|'memory'|'pids'): void { const value=Number((event.target as HTMLInputElement).value); if(target==='retry')this.retryCount.set(value);if(target==='cpu')this.cpuLimit.set(value);if(target==='memory')this.memoryLimitMB.set(value);if(target==='pids')this.pidsLimit.set(value); }
  requestSavePolicy(): void { if (this.detail() && this.policyValidation().length === 0) this.policyConfirmation.set(true); }
  applyPreset(preset: 'small'|'medium'|'large'|'unlimited'): void { const values={small:[0.5,512],medium:[1,2048],large:[2,4096],unlimited:[0,0]}[preset];this.cpuLimit.set(values[0]);this.memoryLimitMB.set(values[1]); }
  cancelSavePolicy(): void { this.policyConfirmation.set(false); }
  confirmSavePolicy(): void { this.policyConfirmation.set(false); this.savePolicy(); }
  private savePolicy(): void { const item=this.detail();if(!item)return;this.savingPolicy.set(true);this.policyMessage.set('');this.docker.updateContainerPolicy(item.id,{restart_policy:this.restartPolicy(),maximum_retry_count:this.retryCount(),cpus:this.cpuLimit(),memory_bytes:this.memoryLimitMB()*1024*1024,pids_limit:this.pidsLimit()}).pipe(finalize(()=>this.savingPolicy.set(false))).subscribe({next:r=>{this.policyMessage.set(r.warnings?.length?`${r.message}: ${r.warnings.join(', ')}`:r.message);this.load()},error:(err:HttpErrorResponse)=>this.error.set(err.error?.error??'ไม่สามารถอัปเดต policy ได้')}); }
}
