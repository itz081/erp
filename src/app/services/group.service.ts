import { Injectable, signal, PLATFORM_ID, inject, forwardRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map, forkJoin, switchMap, of } from 'rxjs';
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
        const user = this.userService.getProfile();
        const isAdmin = user?.permisoBase === 'admin';
        const url = isAdmin ? `${API_URL}/groups?all=true` : `${API_URL}/groups`;

        return this.http.get<any>(url).pipe(
            map(res => {
                const loaded = res.data.grupos;
                const sanitized = loaded.map((g: any) => ({
                    id: g.id,
                    nombre: g.nombre,
                    descripcion: g.descripcion,
                    categoria: g.categoria || 'N/A',
                    nivel: g.nivel || 'N/A',
                    autor: g.autor || g.creador_nombre || '',
                    miembros: g.miembros || [],
                    totalMiembros: g.total_miembros || 0,
                    tickets: []
                }));
                this.groupsSignal.set(sanitized);
                this.hasAttemptedLoad = true;
                return sanitized;
            })
        );
    }

    loadGroupsWithMembers(): void {
        this.http.get<any>(`${API_URL}/groups`).pipe(
            switchMap(res => {
                const grupos = res.data.grupos;
                if (!grupos || grupos.length === 0) return of([]);
                const requests = grupos.map((g: any) =>
                    this.http.get<any>(`${API_URL}/groups/${g.id}`).pipe(
                        map(r => {
                            const grupo = r.data.grupo;
                            return {
                                id: grupo.id,
                                nombre: grupo.nombre,
                                categoria: grupo.categoria || 'N/A',
                                nivel: grupo.nivel || 'N/A',
                                autor: grupo.autor || grupo.creador_nombre || '',
                                miembros: grupo.miembros || [],
                                tickets: []
                            };
                        })
                    )
                );
                return forkJoin(requests);
            })
        ).subscribe({
            next: (grupos: any) => {
                this.groupsSignal.set(grupos as any[]);
                this.hasAttemptedLoad = true;
            }
        });
    }

    private loadingGroups = false;
    private hasAttemptedLoad = false;

    get groups() {
        if (!this.hasAttemptedLoad && !this.loadingGroups && isPlatformBrowser(this.platformId) && localStorage.getItem('auth_token')) {
            this.loadingGroups = true;
            this.loadGroups().subscribe({
                next: () => { this.loadingGroups = false; this.hasAttemptedLoad = true; },
                error: () => { this.loadingGroups = false; this.hasAttemptedLoad = true; }
            });
        }
        return this.groupsSignal.asReadonly();
    }

    getGroup(id: number | string) {
        return this.groupsSignal().find(g => g.id == id);
    }

    createGroup(groupData: any): Observable<any> {
        return this.http.post<any>(`${API_URL}/groups`, {
            nombre: groupData.nombre,
            categoria: groupData.categoria,
            nivel: groupData.nivel,
            autor: groupData.autor
        }).pipe(tap(() => this.loadGroups().subscribe()));
    }

    deleteGroup(id: number | string): Observable<any> {
        return this.http.delete<any>(`${API_URL}/groups/${id}`).pipe(
            tap(() => this.loadGroups().subscribe())
        );
    }

    updateGroup(group: any): Observable<any> {
        return this.http.put<any>(`${API_URL}/groups/${group.id}`, {
            nombre: group.nombre,
            categoria: group.categoria,
            nivel: group.nivel,
            autor: group.autor
        }).pipe(tap(() => this.loadGroups().subscribe()));
    }

    addUserToGroup(groupId: string, username: string, user_id_en_bd: string): Observable<any> {
        return this.http.post<any>(`${API_URL}/members/grupo/${groupId}/usuario/${user_id_en_bd}`, { username })
            .pipe(tap(() => this.loadGroups().subscribe()));
    }

    removeUserFromGroup(groupId: string, user_id_en_bd: string): Observable<any> {
        return this.http.delete<any>(`${API_URL}/members/grupo/${groupId}/usuario/${user_id_en_bd}`)
            .pipe(tap(() => this.loadGroups().subscribe()));
    }

    loadGroupById(id: number | string): Observable<any> {
        return this.http.get<any>(`${API_URL}/groups/${id}`).pipe(
            map(res => {
                const g = res.data.grupo;
                const sanitized = {
                    id: g.id,
                    nombre: g.nombre,
                    categoria: g.categoria || 'N/A',
                    nivel: g.nivel || 'N/A',
                    autor: g.autor || g.creador_nombre || '',
                    miembros: g.miembros || [],
                    tickets: []
                };

                const current = this.groupsSignal();
                const index = current.findIndex(item => item.id == id);
                if (index !== -1) {
                    const updated = [...current];
                    updated[index] = sanitized;
                    this.groupsSignal.set(updated);
                } else {
                    this.groupsSignal.set([...current, sanitized]);
                }

                return sanitized;
            })
        );
    }

    addTicketToGroup(groupId: number | string, ticket: any): Observable<any> {
        return this.loadGroups();
    }
}
