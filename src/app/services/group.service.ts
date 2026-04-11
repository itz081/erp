import { Injectable, signal, PLATFORM_ID, inject, forwardRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { UserService } from './user.service';

const API_URL = 'http://localhost:3000/api';

@Injectable({
    providedIn: 'root'
})
export class GroupService {
    private groupsSignal = signal<any[]>([]);
    private platformId = inject(PLATFORM_ID);
    private http = inject(HttpClient);
    private userService = inject(forwardRef(() => UserService));

    constructor() {
        if (isPlatformBrowser(this.platformId)) {
            const token = localStorage.getItem('auth_token');
            if (token) {
                this.loadGroups().subscribe();
            }
        }
    }

    loadGroups(): Observable<any[]> {
        return this.http.get<any>(`${API_URL}/groups`).pipe(
            map(res => {
                const loaded = res.data.grupos;
                const sanitized = loaded.map((g: any) => ({
                    id: g.id,
                    nombre: g.nombre,
                    descripcion: g.descripcion || '',
                    categoria: 'General', // default para UI local
                    nivel: 'Básico', // default
                    autor: g.creado_por || '',
                    miembros: [], // Lo omitiremos para no romper la app u obtendremos por endpoint
                    tickets: [] // se resolverán por ticketService getTicketsByGroup()
                }));
                this.groupsSignal.set(sanitized);
                return sanitized;
            })
        );
    }

    private loadingGroups = false;

    get groups() {
        if (this.groupsSignal().length === 0 && !this.loadingGroups && isPlatformBrowser(this.platformId) && localStorage.getItem('auth_token')) {
            this.loadingGroups = true;
            this.loadGroups().subscribe({
                next: () => this.loadingGroups = false,
                error: () => this.loadingGroups = false
            });
        }
        return this.groupsSignal.asReadonly();
    }

    getGroup(id: number | string) {
        return this.groupsSignal().find(g => g.id === id);
    }

    createGroup(groupData: any): void {
        this.http.post<any>(`${API_URL}/groups`, {
            nombre: groupData.nombre,
            descripcion: groupData.categoria || groupData.descripcion
        }).subscribe(() => this.loadGroups().subscribe());
    }

    deleteGroup(id: number | string): void {
        this.http.delete<any>(`${API_URL}/groups/${id}`).subscribe(() => this.loadGroups().subscribe());
    }

    updateGroup(group: any): void {
        this.http.put<any>(`${API_URL}/groups/${group.id}`, {
            nombre: group.nombre,
            descripcion: group.categoria || group.descripcion
        }).subscribe(() => this.loadGroups().subscribe());
    }

    // Adaptaciones de API. Algunos componentes enviarán strings/nums
    addUserToGroup(groupId: string, username: string, user_id_en_bd: string): void {
        this.http.post<any>(`${API_URL}/members/grupo/${groupId}/usuario/${user_id_en_bd}`, { username }).subscribe(() => this.loadGroups().subscribe());
    }

    removeUserFromGroup(groupId: string, user_id_en_bd: string): void {
        this.http.delete<any>(`${API_URL}/members/grupo/${groupId}/usuario/${user_id_en_bd}`).subscribe(() => this.loadGroups().subscribe());
    }

    addTicketToGroup(groupId: number | string, ticket: any) {
        // En BD relacional se asocia el ticket en su creación, no es necesario empujar al array
        this.loadGroups().subscribe();
    }
}
