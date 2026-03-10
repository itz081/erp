import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type UserRole = 'admin' | 'reader';

export interface UserPermissions {
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canComment: boolean;
}

export interface UserProfile {
    username: string;
    fullName: string;
    email: string;
    phone: string;
    address: string;
    birthDate: string;
    password: string;
    groupIds?: number[];
    role: UserRole;
    permissions: UserPermissions;
}

const USERS_KEY = 'registered_users_list';
const CURRENT_USER_KEY = 'current_logged_in_user';

@Injectable({
    providedIn: 'root',
})
export class UserService {
    private usersSignal = signal<UserProfile[]>([]);
    private currentUserSignal = signal<UserProfile | null>(null);
    private platformId = inject(PLATFORM_ID);

    constructor() {
        if (isPlatformBrowser(this.platformId)) {
            this.loadUsers();
            this.loadCurrentUser();
        }
    }

    private loadUsers() {
        if (!isPlatformBrowser(this.platformId)) return;
        const raw = localStorage.getItem(USERS_KEY);
        if (raw) {
            const loadedUsers: UserProfile[] = JSON.parse(raw);
            
            // Migration: Ensure all users have the permissions object
            const sanitizedUsers = loadedUsers.map(user => ({
                ...user,
                permissions: user.permissions || {
                    canAdd: false,
                    canEdit: false,
                    canDelete: false,
                    canComment: false
                }
            }));
            
            this.usersSignal.set(sanitizedUsers);
        } else {
            const admin: UserProfile = {
                username: 'admin',
                fullName: 'Administrador',
                email: 'admin@admin.com',
                phone: '1234567890',
                address: 'Calle Falsa 123',
                birthDate: '1990-01-01',
                password: 'Admin123!',
                role: 'admin',
                permissions: {
                    canAdd: true,
                    canEdit: true,
                    canDelete: true,
                    canComment: true
                }
            };
            this.usersSignal.set([admin]);
            this.saveUsers();
        }
    }

    private saveUsers() {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem(USERS_KEY, JSON.stringify(this.usersSignal()));
        }
    }

    private loadCurrentUser() {
        if (!isPlatformBrowser(this.platformId)) return;
        const raw = localStorage.getItem(CURRENT_USER_KEY);
        if (raw) {
            this.currentUserSignal.set(JSON.parse(raw));
        }
    }

    saveProfile(profile: UserProfile): void {
        this.usersSignal.update(users => {
            const index = users.findIndex(u => u.email === profile.email);
            if (index > -1) {
                const newUsers = [...users];
                newUsers[index] = profile;
                return newUsers;
            } else {
                return [...users, profile];
            }
        });
        this.saveUsers();
    }

    getUsers() {
        return this.usersSignal.asReadonly();
    }

    updateUserRole(email: string, role: UserRole): void {
        this.usersSignal.update(users => users.map(u => {
            if (u.email === email) {
                const permissions = role === 'admin' 
                    ? { canAdd: true, canEdit: true, canDelete: true, canComment: true }
                    : u.permissions;
                return { ...u, role, permissions };
            }
            return u;
        }));
        this.saveUsers();
        
        const currentUser = this.currentUserSignal();
        if (currentUser && currentUser.email === email) {
            const permissions = role === 'admin' 
                ? { canAdd: true, canEdit: true, canDelete: true, canComment: true }
                : currentUser.permissions;
            this.setCurrentUser({ ...currentUser, role, permissions });
        }
    }

    updateUserPermissions(email: string, permissions: UserPermissions): void {
        this.usersSignal.update(users => users.map(u => {
            if (u.email === email) {
                return { ...u, permissions };
            }
            return u;
        }));
        this.saveUsers();
        
        const currentUser = this.currentUserSignal();
        if (currentUser && currentUser.email === email) {
            this.setCurrentUser({ ...currentUser, permissions });
        }
    }

    setCurrentUser(user: UserProfile | null) {
        if (isPlatformBrowser(this.platformId)) {
            if (user) {
                localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
            } else {
                localStorage.removeItem(CURRENT_USER_KEY);
            }
        }
        this.currentUserSignal.set(user);
    }

    getCurrentUser() {
        return this.currentUserSignal.asReadonly();
    }

    getProfile(): UserProfile | null {
        return this.currentUserSignal();
    }

    clearProfile(): void {
        this.setCurrentUser(null);
    }

    validateCredentials(email: string, pass: string): UserProfile | null {
        return this.usersSignal().find(u => u.email === email && u.password === pass) || null;
    }
}
