import { Injectable, signal, PLATFORM_ID, inject, forwardRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Group } from '../models/group.model';
import { UserService } from './user.service';

const GROUPS_KEY = 'groups_data_list';

@Injectable({
    providedIn: 'root'
})
export class GroupService {
    private groupsSignal = signal<Group[]>([]);
    private platformId = inject(PLATFORM_ID);
    private userService = inject(forwardRef(() => UserService));

    constructor() {
        if (isPlatformBrowser(this.platformId)) {
            this.loadGroups();
        }
    }

    private loadGroups() {
        const raw = localStorage.getItem(GROUPS_KEY);
        if (raw) {
            this.groupsSignal.set(JSON.parse(raw));
        } else {
            const initialGroups: Group[] = [
                {
                    id: 1,
                    nombre: 'Frontend',
                    categoria: 'Tecnología',
                    nivel: 'Avanzado',
                    autor: 'Admin',
                    miembros: [{ username: 'admin', email: 'admin@admin.com' }],
                    tickets: []
                },
                {
                    id: 2,
                    nombre: 'Backend',
                    categoria: 'Tecnología',
                    nivel: 'Intermedio',
                    autor: 'Admin',
                    miembros: [],
                    tickets: []
                }
            ];
            this.groupsSignal.set(initialGroups);
            this.saveGroups();
        }
    }

    private saveGroups() {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem(GROUPS_KEY, JSON.stringify(this.groupsSignal()));
        }
    }

    get groups() {
        return this.groupsSignal.asReadonly();
    }

    getGroup(id: number) {
        return this.groupsSignal().find(g => g.id === id);
    }

    createGroup(groupData: Partial<Group>) {
        const nextId = this.groupsSignal().length > 0 ? Math.max(...this.groupsSignal().map(g => g.id)) + 1 : 1;
        
        let initialMembers: any[] = [];
        const currentUser = this.userService.getCurrentUser()();
        if (currentUser && currentUser.permisoBase === 'admin') {
            initialMembers.push({
                username: currentUser.username,
                email: currentUser.email
            });
        }
        
        this.groupsSignal.update(gs => [...gs, { 
            id: nextId, 
            nombre: groupData.nombre!,
            categoria: groupData.categoria || '',
            nivel: groupData.nivel || '',
            autor: groupData.autor || '',
            miembros: initialMembers, 
            tickets: [] 
        }]);
        this.saveGroups();
    }

    deleteGroup(id: number) {
        this.groupsSignal.update(gs => gs.filter(g => g.id !== id));
        this.saveGroups();
    }

    updateGroup(group: Group) {
        this.groupsSignal.update(gs => gs.map(g => g.id === group.id ? group : g));
        this.saveGroups();
    }

    addUserToGroup(groupId: number, username: string, email: string) {
        this.groupsSignal.update(gs => gs.map(g => {
            if (g.id === groupId && !g.miembros.some(m => m.username === username)) {
                return { ...g, miembros: [...g.miembros, { username, email }] };
            }
            return g;
        }));
        this.saveGroups();
    }

    removeUserFromGroup(groupId: number, username: string) {
        this.groupsSignal.update(gs => gs.map(g => {
            if (g.id === groupId) {
                return { ...g, miembros: g.miembros.filter(m => m.username !== username) };
            }
            return g;
        }));
        this.saveGroups();
    }

    addTicketToGroup(groupId: number, ticket: any) {
        this.groupsSignal.update(gs => gs.map(g => {
            if (g.id === groupId) {
                // Clona el ticket para no mutar el modelo
                return { ...g, tickets: [...g.tickets, ticket] };
            }
            return g;
        }));
        this.saveGroups();
    }
}
