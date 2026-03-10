import { Injectable, signal } from '@angular/core';
import { Group } from '../models/group.model';

@Injectable({
    providedIn: 'root'
})
export class GroupService {
    private groupsSignal = signal<Group[]>([
        {
            id: 1,
            nombre: 'Frontend Dev Team',
            miembros: [{ username: 'admin', email: 'admin@test.com' }],
            tickets: []
        },
        {
            id: 2,
            nombre: 'Backend Dev Team',
            miembros: [],
            tickets: []
        }
    ]);

    get groups() {
        return this.groupsSignal.asReadonly();
    }

    getGroup(id: number) {
        return this.groupsSignal().find(g => g.id === id);
    }

    createGroup(nombre: string) {
        const nextId = this.groupsSignal().length > 0 ? Math.max(...this.groupsSignal().map(g => g.id)) + 1 : 1;
        this.groupsSignal.update(gs => [...gs, { id: nextId, nombre, miembros: [], tickets: [] }]);
    }

    addUserToGroup(groupId: number, username: string, email: string) {
        this.groupsSignal.update(gs => gs.map(g => {
            if (g.id === groupId && !g.miembros.some(m => m.username === username)) {
                return { ...g, miembros: [...g.miembros, { username, email }] };
            }
            return g;
        }));
    }

    removeUserFromGroup(groupId: number, username: string) {
        this.groupsSignal.update(gs => gs.map(g => {
            if (g.id === groupId) {
                return { ...g, miembros: g.miembros.filter(m => m.username !== username) };
            }
            return g;
        }));
    }
}
