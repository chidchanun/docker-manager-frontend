export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthUser {
    email: string;
    role: string;
}

export interface AuthResponse {
    authenticated: boolean;
    user: AuthUser;
}

export interface LogoutResponse {
    success: boolean;
    message: string;
}

export interface ApiError {
    error: string;
}