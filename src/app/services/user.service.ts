import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

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
    username: string;
    fullName: string;
    email: string;
    phone: string;
    address: string;
    birthDate: string;
    password: string;
    groupIds?: number[];
    permisoBase: PermisoBase;
    permissions?: UserPermissions;
    groupPermissions?: GroupPermissions;
    ticketPermissions?: TicketPermissions;
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
            const loadedUsers: any[] = JSON.parse(raw);
            
            const sanitizedUsers = loadedUsers.map(user => {
                const permisoBase = user.permisoBase || user.role || 'user';
                const permissions = permisoBase === 'admin'
                    ? { canAdd: true, canEdit: true, canDelete: true, canComment: true }
                    : (user.permissions || {
                        canAdd: false,
                        canEdit: false,
                        canDelete: false,
                        canComment: true
                    });

                const groupPermissions = permisoBase === 'admin'
                    ? { canAdd: true, canEdit: true, canDelete: true, canComment: true }
                    : (user.groupPermissions || Object.assign({}, permissions));

                const ticketPermissions = permisoBase === 'admin'
                    ? { canAdd: true, canEdit: true, canDelete: true }
                    : (user.ticketPermissions || { canAdd: permissions.canAdd, canEdit: permissions.canEdit, canDelete: permissions.canDelete });
                
                if (user.role) delete user.role;
                
                return {
                    ...user,
                    permisoBase,
                    permissions,
                    groupPermissions,
                    ticketPermissions
                };
            });
            
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
                permisoBase: 'admin',
                permissions: {
                    canAdd: true,
                    canEdit: true,
                    canDelete: true,
                    canComment: true
                },
                groupPermissions: { canAdd: true, canEdit: true, canDelete: true, canComment: true },
                ticketPermissions: { canAdd: true, canEdit: true, canDelete: true }
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
            const user = JSON.parse(raw);
            const permisoBase = user.permisoBase || user.role || 'user';
            const permissions = permisoBase === 'admin'
                ? { canAdd: true, canEdit: true, canDelete: true, canComment: true }
                : (user.permissions || {
                    canAdd: false,
                    canEdit: false,
                    canDelete: false,
                    canComment: true
                });
            
            const groupPermissions = permisoBase === 'admin'
                ? { canAdd: true, canEdit: true, canDelete: true, canComment: true }
                : (user.groupPermissions || Object.assign({}, permissions));

            const ticketPermissions = permisoBase === 'admin'
                ? { canAdd: true, canEdit: true, canDelete: true }
                : (user.ticketPermissions || { canAdd: permissions.canAdd, canEdit: permissions.canEdit, canDelete: permissions.canDelete });
                
            if (user.role) delete user.role;

            this.currentUserSignal.set({ ...user, permisoBase, permissions, groupPermissions, ticketPermissions });
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

    updateUserPermisoBase(email: string, permisoBase: PermisoBase): void {
        this.usersSignal.update(users => users.map(u => {
            if (u.email === email) {
                const permissions = permisoBase === 'admin' 
                    ? { canAdd: true, canEdit: true, canDelete: true, canComment: true }
                    : u.permissions;
                const groupPermissions = permisoBase === 'admin'
                    ? { canAdd: true, canEdit: true, canDelete: true, canComment: true }
                    : u.groupPermissions;
                const ticketPermissions = permisoBase === 'admin'
                    ? { canAdd: true, canEdit: true, canDelete: true }
                    : u.ticketPermissions;
                return { ...u, permisoBase, permissions, groupPermissions, ticketPermissions };
            }
            return u;
        }));
        this.saveUsers();
        
        const currentUser = this.currentUserSignal();
        if (currentUser && currentUser.email === email) {
            const permissions = permisoBase === 'admin' 
                ? { canAdd: true, canEdit: true, canDelete: true, canComment: true }
                : currentUser.permissions;
            const groupPermissions = permisoBase === 'admin'
                ? { canAdd: true, canEdit: true, canDelete: true, canComment: true }
                : currentUser.groupPermissions;
            const ticketPermissions = permisoBase === 'admin'
                ? { canAdd: true, canEdit: true, canDelete: true }
                : currentUser.ticketPermissions;
            this.setCurrentUser({ ...currentUser, permisoBase, permissions, groupPermissions, ticketPermissions });
        }
    }

    updateUserPermissions(email: string, groupPermissions: GroupPermissions, ticketPermissions: TicketPermissions): void {
        this.usersSignal.update(users => users.map(u => {
            if (u.email === email) {
                return { ...u, groupPermissions, ticketPermissions, permissions: u.permissions };
            }
            return u;
        }));
        this.saveUsers();
        
        const currentUser = this.currentUserSignal();
        if (currentUser && currentUser.email === email) {
            this.setCurrentUser({ ...currentUser, groupPermissions, ticketPermissions });
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

    deleteUser(email: string): void {
        this.usersSignal.update(users => users.filter(u => u.email !== email));
        this.saveUsers();
    }

    validateCredentials(email: string, pass: string): UserProfile | null {
        return this.usersSignal().find(u => u.email === email && u.password === pass) || null;
    }
}
