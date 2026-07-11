import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { NonNullableFormBuilder, ReactiveFormsModule, Validator, Validators } from "@angular/forms";
import { HttpErrorResponse } from "@angular/common/http";

import { Router } from "@angular/router";
import { finalize } from "rxjs";

import { ApiError } from "../../core/models/auth.model";
import { AuthService } from "../../core/services/auth.service";

@Component({
    selector: 'app-login',
    imports: [
        ReactiveFormsModule,
    ],
    templateUrl: './login.html',
    styleUrl: './login.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
    private readonly formBuilder = inject(
        NonNullableFormBuilder,
    );

    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    readonly loading = signal(false);
    readonly errorMessage = signal('');

    readonly loginForm = this.formBuilder.group({
        email: [
            '',
            [
                Validators.required,
                Validators.email,
            ]
        ],

        password: [
            '',
            [
                Validators.required,
                Validators.minLength(12),
                Validators.maxLength(72),
            ]
        ]
    });

    submit(): void {
        this.errorMessage.set('');

        if (this.loginForm.invalid) {
            this.loginForm.markAllAsTouched();
            return;
        }

        this.loading.set(true);

        this.authService
            .login(this.loginForm.getRawValue())
            .pipe(
                finalize(() => {
                    this.loading.set(false)
                }),
            )
            .subscribe({
                next: () => {
                    void this.router.navigateByUrl('/dashboard');
                },

                error: (error: HttpErrorResponse) => {
                    this.errorMessage.set(
                        this.getErrorMessage(error),
                    );
                },
            });

    }

    private getErrorMessage(
        error: HttpErrorResponse,
    ): string {
        const response = error.error as Partial<ApiError> | null;

        if (error.status === 0) {
            return 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้';
        }

        if (error.status === 401) {
            return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
        }

        return response?.error ??
            'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
    }
}
