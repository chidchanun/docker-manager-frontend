import { HttpClient } from "@angular/common/http";
import { computed, inject, Injectable, signal } from "@angular/core";
import { Observable, tap } from "rxjs";

import {
    AuthResponse,
    AuthUser,
    LoginRequest,
    LogoutResponse
} from '../models/auth.model';

@Injectable({
    providedIn: "root",
})
export class AuthService{
    private readonly http = inject(HttpClient);

    private readonly currentUserSignal = signal<AuthUser | null>(null);

    readonly currentUser = this.currentUserSignal.asReadonly();

    readonly isAuthenticated = computed(
        () => this.currentUserSignal() !== null,
    );

    login(request: LoginRequest): Observable<AuthResponse> {
        return this.http
            .post<AuthResponse>('/api/auth/login', request)
            .pipe(
                tap((response) => {
                    this.currentUserSignal.set(response.user);
                }),
            )
    };

    me(): Observable<AuthResponse> {
        return this.http
            .get<AuthResponse>('/api/auth/me')
            .pipe(
                tap((response) => {
                    this.currentUserSignal.set(response.user);
                })
            )
    };

    logout(): Observable<LogoutResponse> {
        return this.http
            .post<LogoutResponse>('/api/auth/logout', {})
            .pipe(
                tap(() => {
                    this.clearSession();
                })
            )
    };

    clearSession() : void {
        this.currentUserSignal.set(null)
    };
}

