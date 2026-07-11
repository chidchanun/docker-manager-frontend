import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";

import { ContainerActionResponse, ContainerDetailResponse, ContainerListResponse, ContainerLogsResponse, ContainerStatsListResponse, DockerInfoResponse } from "../models/docker.model";

@Injectable({
    providedIn: "root"
})
export class DockerService {
    private readonly http = inject(HttpClient)

    getInfo(): Observable<DockerInfoResponse> {
        return this.http.get<DockerInfoResponse>(
            '/api/docker/info',
        );
    }

    getContainers(
        all = true,
    ): Observable<ContainerListResponse> {
        const params = new HttpParams().set(
            'all',
            String(all),
        );

        return this.http.get<ContainerListResponse>(
            '/api/containers',
            { params },
        );
    }

    getContainerStats(): Observable<ContainerStatsListResponse> {
        return this.http.get<ContainerStatsListResponse>('/api/containers/stats');
    }

    getContainerLogs(containerID: string, tail = 200, timestamps = true): Observable<ContainerLogsResponse> {
        const identifier = encodeURIComponent(containerID);
        const params = new HttpParams()
            .set('tail', tail)
            .set('timestamps', timestamps);
        return this.http.get<ContainerLogsResponse>(`/api/containers/${identifier}/logs`, { params });
    }

    getContainerDetail(containerID: string): Observable<ContainerDetailResponse> {
        return this.http.get<ContainerDetailResponse>(`/api/containers/${encodeURIComponent(containerID)}`);
    }

    startContainer(
        containerID: string,
    ): Observable<ContainerActionResponse> {
        const identifier = encodeURIComponent(containerID);

        return this.http.post<ContainerActionResponse>(
            `/api/containers/${identifier}/start`, {}
        )
    }

    stopContainer(
        containerID: string,
        timeoutSeconds = 10,
    ): Observable<ContainerActionResponse> {
        const identifier = encodeURIComponent(containerID);

        const params = new HttpParams().set(
            'timeout',
            timeoutSeconds,
        );

        return this.http.post<ContainerActionResponse>(
            `/api/containers/${identifier}/stop`, {}, { params }
        )
    }

    restartContainer(
        containerID: string,
        timeoutSeconds = 10,
    ): Observable<ContainerActionResponse> {
        const identifier = encodeURIComponent(containerID);

        const params = new HttpParams().set(
            'timeout',
            timeoutSeconds,
        );

        return this.http.post<ContainerActionResponse>(
            `/api/containers/${identifier}/restart`,
            {},
            { params },
        );
    }

    pauseContainer(id: string): Observable<ContainerActionResponse> { return this.http.post<ContainerActionResponse>(`/api/containers/${encodeURIComponent(id)}/pause`, {}); }
    unpauseContainer(id: string): Observable<ContainerActionResponse> { return this.http.post<ContainerActionResponse>(`/api/containers/${encodeURIComponent(id)}/unpause`, {}); }
    killContainer(id: string): Observable<ContainerActionResponse> { return this.http.post<ContainerActionResponse>(`/api/containers/${encodeURIComponent(id)}/kill`, {}); }
    removeContainer(id: string): Observable<ContainerActionResponse> { return this.http.delete<ContainerActionResponse>(`/api/containers/${encodeURIComponent(id)}`); }


}
