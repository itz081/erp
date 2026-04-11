import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map, catchError, of } from 'rxjs';

export type PermisoBase = 'admin' | 'user';

export interface GroupPermissions {
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canComment: boolean;
}

export interface TicketPermissions {
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
}

export interface UserPermissions {
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canComment: boolean;
}

export interface UserProfile {
    id?: string;
    username: string;
    fullName: string;
    email: string;
    phone: string;
    address: string;
    birthDate: string;
    password?: string;
    groupIds?: number[];
    permisoBase: PermisoBase;
    permissions?: UserPermissions;
    groupPermissions?: GroupPermissions;
    ticketPermissions?: TicketPermissions;
}

const API_URL = 'http://localhost:3000/api';

@Injectable({
    providedIn: 'root',
})
export class UserService {
    private usersSignal = signal<UserProfile[]>([]);
    private currentUserSignal = signal<UserProfile | null>(null);
    private platformId = inject(PLATFORM_ID);
    private http = inject(HttpClient);

    constructor() {
        if (isPlatformBrowser(this.platformId)) {
            const token = localStorage.getItem('auth_token');
            if (token) {
                this.loadCurrentUser().subscribe();
            }
        }
    }

    private mapBackendUser(backendUser: any): UserProfile {
        const permisosArray: string[] = Array.isArray(backendUser.permisos) 
            ? backendUser.permisos.map((p: any) => typeof p === 'string' ? p : p.nombre)
            : [];
        const isAdmin = permisosArray.includes('users:manage') && permisosArray.includes('groups:manage');
        
        const permissions: UserPermissions = {
            canAdd: isAdmin || permisosArray.includes('tickets:add'),
            canEdit: isAdmin || permisosArray.includes('tickets:edit'),
            canDelete: isAdmin || permisosArray.includes('tickets:delete'),
            canComment: isAdmin || permisosArray.includes('tickets:comment')
        };

        const groupPermissions: GroupPermissions = {
            canAdd: isAdmin || permisosArray.includes('groups:manage'),
            canEdit: isAdmin || permisosArray.includes('groups:manage'),
            canDelete: isAdmin || permisosArray.includes('groups:manage'),
            canComment: true
        };

        const ticketPermissions: TicketPermissions = {
            canAdd: isAdmin || permisosArray.includes('tickets:add'),
            canEdit: isAdmin || permisosArray.includes('tickets:edit'),
            canDelete: isAdmin || permisosArray.includes('tickets:delete')
        };

        return {
            id: backendUser.id,
            username: backendUser.username,
            fullName: backendUser.nombre_completo || '',
            email: backendUser.email,
            phone: backendUser.telefono || '',
            address: backendUser.direccion || '',
            birthDate: '1990-01-01',
            permisoBase: isAdmin ? 'admin' : 'user',
            permissions,
            groupPermissions,
            ticketPermissions
        };
    }

    loadUsers(): Observable<UserProfile[]> {
        return this.http.get<any>(`${API_URL}/users`).pipe(
            map(res => {
                const users = res.data.users.map((u: any) => this.mapBackendUser(u));
                this.usersSignal.set(users);
                return users;
            })
        );
    }

    loadCurrentUser(): Observable<UserProfile | null> {
        return this.http.get<any>(`${API_URL}/auth/me`).pipe(
            map(res => {
                if (res.data && res.data.user) {
                    const user = this.mapBackendUser(res.data.user);
                    this.currentUserSignal.set(user);
                    return user;
                }
                return null;
            }),
            catchError(() => {
                this.currentUserSignal.set(null);
                return of(null);
            })
        );
    }

    login(email: string, pass: string): Observable<UserProfile | null> {
        return this.http.post<any>(`${API_URL}/auth/login`, { email, password: pass }).pipe(
            map(res => {
                if (res.data && res.data.token && res.data.user) {
                    if (isPlatformBrowser(this.platformId)) {
                        localStorage.setItem('auth_token', res.data.token);
                    }
                    const user = this.mapBackendUser(res.data.user);
                    this.currentUserSignal.set(user);
                    return user;
                }
                return null;
            })
        );
    }

    register(profile: UserProfile): Observable<any> {
        const payload = {
            nombre_completo: profile.fullName,
            username: profile.username,
            email: profile.email,
            password: profile.password,
            telefono: profile.phone,
            direccion: profile.address
        };
        return this.http.post<any>(`${API_URL}/auth/register`, payload);
    }

    saveProfile(profile: UserProfile): void {
        this.http.put<any>(`${API_URL}/users/${profile.id}`, profile).subscribe(() => this.loadUsers().subscribe());
    }

    private loadingUsers = false;

    getUsers() {
        if (this.usersSignal().length === 0 && !this.loadingUsers) {
            this.loadingUsers = true;
            this.loadUsers().subscribe({
                next: () => this.loadingUsers = false,
                error: () => this.loadingUsers = false
            });
        }
        return this.usersSignal.asReadonly();
    }

    updateUserPermisoBase(email: string, permisoBase: PermisoBase): void {
        const user = this.usersSignal().find(u => u.email === email);
        if (user && user.id) {
            const body = { permisos_globales: [] as string[] };
            if (permisoBase === 'admin') {
                body.permisos_globales = ['tickets:add', 'tickets:edit', 'tickets:delete', 'tickets:move', 'tickets:comment', 'groups:manage', 'users:manage'];
            }
            this.http.put(`${API_URL}/users/${user.id}/permisos`, body).subscribe(() => this.loadUsers().subscribe());
        }
    }

    updateUserPermissions(email: string, groupPermissions: GroupPermissions, ticketPermissions: TicketPermissions): void {
        const user = this.usersSignal().find(u => u.email === email);
        if (user && user.id) {
            const permisos_globales: string[] = [];
            if (ticketPermissions.canAdd) permisos_globales.push('tickets:add');
            if (ticketPermissions.canEdit) permisos_globales.push('tickets:edit');
            if (ticketPermissions.canDelete) permisos_globales.push('tickets:delete');
            if (groupPermissions.canAdd) permisos_globales.push('groups:manage'); // Simplificación
            
            this.http.put(`${API_URL}/users/${user.id}/permisos`, { permisos_globales }).subscribe(() => this.loadUsers().subscribe());
        }
    }

    setCurrentUser(user: UserProfile | null) {
        this.currentUserSignal.set(user);
    }

    getCurrentUser() {
        return this.currentUserSignal.asReadonly();
    }

    getProfile(): UserProfile | null {
        return this.currentUserSignal();
    }

    clearProfile(): void {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.removeItem('auth_token');
        }
        this.currentUserSignal.set(null);
        this.http.post(`${API_URL}/auth/logout`, {}).subscribe({ error: () => {} });
    }

    deleteUser(email: string): void {
        const user = this.usersSignal().find(u => u.email === email);
        if (user && user.id) {
            this.http.delete(`${API_URL}/users/${user.id}`).subscribe(() => this.loadUsers().subscribe());
        }
    }

    validateCredentials(email: string, pass: string): UserProfile | null {
        // Obsoleto, usar login() observable
        return null;
    }
}
