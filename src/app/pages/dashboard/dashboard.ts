import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { finalize, forkJoin, Observable } from "rxjs";

import { AuthService } from "../../core/services/auth.service";
import { ApiError } from '../../core/models/auth.model';
import { ContainerActionResponse, ContainerResponse, ContainerStats, ContainerStatsListResponse, DockerInfoResponse } from '../../core/models/docker.model';
import { DockerService } from '../../core/services/docker.service';
import { ToastService } from '../../core/services/toast.service';

type ContainerAction =
    | 'start'
    | 'stop'
    | 'restart'
    | 'pause'
    | 'unpause'
    | 'kill'
    | 'remove';

type ContainerStateFilter =
    | 'all'
    | 'running'
    | 'exited'
    | 'paused'
    | 'restarting';

@Component({
    selector: 'app-dashboard',
    imports: [RouterLink],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
    private readonly authService = inject(AuthService);
    private readonly dockerService = inject(DockerService)
    private readonly router = inject(Router);
    private readonly toast = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);

    readonly currentUser = this.authService.currentUser;

    readonly dockerInfo = signal<DockerInfoResponse | null>(null);

    readonly containers =
        signal<ContainerResponse[]>([]);

    readonly initialLoading = signal(true);
    readonly refreshing = signal(false);
    readonly loggingOut = signal(false);

    readonly actionContainerID = signal<string | null>(null);

    readonly errorMessage = signal('');
    readonly successMessage = signal('');
    readonly pendingAction = signal<{ container: ContainerResponse; action: ContainerAction } | null>(null);

    readonly stats = signal<ContainerStatsListResponse | null>(null);
    readonly selectedStatsID = signal('total');
    readonly statsHistory = signal<ContainerStats[]>([]);

    readonly selectedStats = computed(() => {
        const response = this.stats();
        if (!response) return null;
        return this.selectedStatsID() === 'total'
            ? response.total
            : response.items.find((item) => item.id === this.selectedStatsID()) ?? response.total;
    });

    readonly searchTerm = signal('');
    readonly sortBy = signal<'name' | 'state' | 'created'>('name');
    readonly page = signal(1);
    readonly pageSize = 10;

    readonly stateFilter = signal<ContainerStateFilter>('all');

    readonly runningCount = computed(() => {
        return this.containers().filter(
            (container) => container.state === 'running',
        ).length;
    });

    readonly stoppedCount = computed(() => {
        return this.containers().filter(
            (container) => container.state === 'exited',
        ).length;
    });

    readonly filteredContainers = computed(() => {
        const search = this.searchTerm()
            .trim()
            .toLowerCase();

        const state = this.stateFilter();

        return this.containers().filter((container) => {
            const matchesState =
                state === 'all' ||
                container.state === state;

            const searchableText = [
                container.name,
                container.short_id,
                container.image,
                container.status,
                container.compose_project ?? '',
                container.compose_service ?? '',
            ]
                .join(' ')
                .toLowerCase();

            const matchesSearch =
                search === '' ||
                searchableText.includes(search);

            return matchesState && matchesSearch;
        }).sort((left, right) => {
            const sort = this.sortBy();
            if (sort === 'created') return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
            return String(left[sort]).localeCompare(String(right[sort]));
        });
    });

    readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredContainers().length / this.pageSize)));
    readonly paginatedContainers = computed(() => this.filteredContainers().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize));

    updateSort(event: Event): void { this.sortBy.set((event.target as HTMLSelectElement).value as 'name' | 'state' | 'created'); this.page.set(1); }
    previousPage(): void { this.page.update(value => Math.max(1, value - 1)); }
    nextPage(): void { this.page.update(value => Math.min(this.totalPages(), value + 1)); }

    constructor() {
        this.loadDashboard();
        this.loadStats();
        const timer = window.setInterval(() => this.loadStats(), 5000);
        this.destroyRef.onDestroy(() => window.clearInterval(timer));
    }

    updateStatsTarget(event: Event): void {
        this.selectedStatsID.set((event.target as HTMLSelectElement).value);
        this.statsHistory.set([]);
        this.loadStats();
    }

    chartPoints(
        metric: keyof ContainerStats,
        relatedMetric?: keyof ContainerStats,
    ): string {
        const values = this.statsHistory().map((item) => Number(item[metric]) || 0);
        if (values.length === 0) return '';
        const relatedValues = relatedMetric
            ? this.statsHistory().map((item) => Number(item[relatedMetric]) || 0)
            : [];
        const max = Math.max(
            ...values,
            ...relatedValues,
            metric === 'cpu_percent' || metric === 'memory_percent' ? 100 : 1,
        );
        return values.map((value, index) => {
            const x = values.length === 1 ? 100 : (index / (values.length - 1)) * 100;
            const y = 38 - (value / max) * 34;
            return `${x},${y}`;
        }).join(' ');
    }

    formatBytesValue(value: number): string {
        if (!value) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
        return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
    }

    refresh(): void {
        if (this.refreshing()) {
            return;
        }

        this.loadDashboard(true);
    }

    performAction(
        container: ContainerResponse,
        action: ContainerAction,
        confirmed = false,
    ): void {
        if (this.actionContainerID() !== null) {
            return;
        }

        if (action !== 'start' && action !== 'unpause' && !confirmed) {
            this.pendingAction.set({ container, action });
            return;
        }

        this.errorMessage.set('');
        this.successMessage.set('');
        this.actionContainerID.set(container.id);

        this.getActionRequest(
            container.id,
            action,
        )
            .pipe(
                finalize(() => {
                    this.actionContainerID.set(null);
                }),
            )
            .subscribe({
                next: (result) => {
                    this.successMessage.set(result.message);
                    this.toast.success(result.message);
                    this.loadDashboard(true);
                },

                error: (error: HttpErrorResponse) => {
                    this.handleRequestError(error);
                },
            });
    }

    updateSearch(event: Event): void {
        const input = event.target as HTMLInputElement;

        this.searchTerm.set(input.value);
        this.page.set(1);
    }

    updateStateFilter(event: Event): void {
        const select = event.target as HTMLSelectElement;

        this.stateFilter.set(
            select.value as ContainerStateFilter,
        );
        this.page.set(1);
    }

    isContainerActionRunning(
        containerID: string,
    ): boolean {
        return this.actionContainerID() === containerID;
    }

    formatPorts(
        ports: ContainerResponse['ports'],
    ): string {
        if (ports.length === 0) {
            return '—';
        }

        return ports
            .map((port) => {
                if (!port.host_port) {
                    return `${port.container_port}/${port.protocol}`;
                }

                const host =
                    !port.host_ip ||
                        port.host_ip === '0.0.0.0' ||
                        port.host_ip === '::'
                        ? 'localhost'
                        : port.host_ip;

                return `${host}:${port.host_port} → ${port.container_port}/${port.protocol}`;
            })
            .join(', ');
    }

    formatDate(value: string): string {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return new Intl.DateTimeFormat('th-TH', {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(date);
    }



    logout(): void {
        if (this.loggingOut()) {
            return;
        }

        this.loggingOut.set(true);

        this.authService
            .logout()
            .pipe(
                finalize(() => {
                    this.loggingOut.set(false);
                }),
            )
            .subscribe({
                next: () => {
                    void this.router.navigateByUrl('/login');
                },

                error: () => {
                    this.authService.clearSession();
                    void this.router.navigateByUrl('/login');
                },
            });
    }


    private loadDashboard(
        manualRefresh = false,
    ): void {
        this.errorMessage.set('');

        if (manualRefresh) {
            this.refreshing.set(true);
        } else {
            this.initialLoading.set(true);
        }

        forkJoin({
            info: this.dockerService.getInfo(),
            containers:
                this.dockerService.getContainers(true),
        })
            .pipe(
                finalize(() => {
                    this.initialLoading.set(false);
                    this.refreshing.set(false);
                }),
            )
            .subscribe({
                next: ({ info, containers }) => {
                    this.dockerInfo.set(info);
                    this.containers.set(containers.items);
                },

                error: (error: HttpErrorResponse) => {
                    this.handleRequestError(error);
                },
            });
    }

    cancelPendingAction(): void { this.pendingAction.set(null); }
    confirmPendingAction(): void {
        const pending = this.pendingAction();
        this.pendingAction.set(null);
        if (pending) this.performAction(pending.container, pending.action, true);
    }

    performSelectedAction(container: ContainerResponse, event: Event): void {
        const select = event.target as HTMLSelectElement;
        const action = select.value as ContainerAction;
        select.value = '';
        if (action) this.performAction(container, action);
    }

    private loadStats(): void {
        this.dockerService.getContainerStats().subscribe({
            next: (response) => {
                this.stats.set(response);
                const sample = this.selectedStatsID() === 'total'
                    ? response.total
                    : response.items.find((item) => item.id === this.selectedStatsID());
                if (sample) this.statsHistory.update((history) => [...history, sample].slice(-24));
            },
            error: (error: HttpErrorResponse) => {
                if (error.status === 401) this.handleRequestError(error);
            },
        });
    }

    private getActionRequest(
        containerID: string,
        action: ContainerAction,
    ): Observable<ContainerActionResponse> {
        switch (action) {
            case 'start':
                return this.dockerService.startContainer(
                    containerID,
                );

            case 'stop':
                return this.dockerService.stopContainer(
                    containerID,
                    10,
                );

            case 'restart':
                return this.dockerService.restartContainer(
                    containerID,
                    10,
                );
            case 'pause': return this.dockerService.pauseContainer(containerID);
            case 'unpause': return this.dockerService.unpauseContainer(containerID);
            case 'kill': return this.dockerService.killContainer(containerID);
            case 'remove': return this.dockerService.removeContainer(containerID);
        }
    }

    private handleRequestError(
        error: HttpErrorResponse,
    ): void {
        if (error.status === 401) {
            this.authService.clearSession();

            void this.router.navigateByUrl('/login');
            return;
        }

        if (error.status === 0) {
            this.errorMessage.set(
                'ไม่สามารถเชื่อมต่อกับ Docker Manager API ได้',
            );
            return;
        }

        const body =
            error.error as Partial<ApiError> | null;

        this.errorMessage.set(
            body?.error ??
            'เกิดข้อผิดพลาดระหว่างอ่านข้อมูล Docker',
        );
        this.toast.error(this.errorMessage());
    }
}
