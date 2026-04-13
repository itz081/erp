import { Injectable, signal, PLATFORM_ID, inject, forwardRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map, forkJoin } from 'rxjs';
import { Ticket } from '../models/ticket.model';
import { GroupService } from './group.service';

const API_URL = 'http://localhost:3000/api';

@Injectable({
    providedIn: 'root'
})
export class TicketService {
    private ticketsSignal = signal<any[]>([]);
    private estadosSignal = signal<any[]>([]);
    private prioridadesSignal = signal<any[]>([]);
    private platformId = inject(PLATFORM_ID);
    private http = inject(HttpClient);
    private groupService = inject(forwardRef(() => GroupService));

    constructor() {
        if (isPlatformBrowser(this.platformId)) {
            const token = localStorage.getItem('auth_token');
            if (token) {
                this.loadTickets().subscribe();
                this.loadCatalogs().subscribe();
            }
        }
    }

    loadCatalogs(): Observable<any> {
        return forkJoin({
            estados: this.http.get<any>(`${API_URL}/tickets/catalogs/estados`),
            prioridades: this.http.get<any>(`${API_URL}/tickets/catalogs/prioridades`)
        }).pipe(
            tap((res: any) => {
                this.estadosSignal.set(res.estados.data.estados);
                this.prioridadesSignal.set(res.prioridades.data.prioridades);
            })
        );
    }

    get estados() { return this.estadosSignal.asReadonly(); }
    get prioridades() { return this.prioridadesSignal.asReadonly(); }

    loadTickets(): Observable<any[]> {
        return this.http.get<any>(`${API_URL}/tickets`).pipe(
            map(res => {
                const loaded = res.data.tickets;
                const sanitized = loaded.map((t: any) => ({
                    ...t,
                    id: t.id,
                    titulo: t.titulo,
                    descripcion: t.descripcion,
                    estado: t.estado_nombre || 'PENDIENTE',
                    estadoId: t.estado_id,
                    prioridad: t.prioridad_nombre || 'MEDIA',
                    prioridadId: t.prioridad_id,
                    fechaCreacion: t.creado_en ? new Date(t.creado_en) : new Date(),
                    fechaLimite: t.fecha_final ? new Date(t.fecha_final) : null,
                    groupId: t.grupo_id,
                    asignadoA: t.asignado_nombre || '',
                    asignadoId: t.asignado_id,
                    comentarios: [],
                    historialCambios: []
                }));
                this.ticketsSignal.set(sanitized);
                this.hasAttemptedLoad = true;
                return sanitized;
            })
        );
    }

    private loadingTickets = false;
    private hasAttemptedLoad = false;

    get tickets() {
        if (!this.hasAttemptedLoad && !this.loadingTickets && isPlatformBrowser(this.platformId) && localStorage.getItem('auth_token')) {
            this.loadingTickets = true;
            this.loadTickets().subscribe({
                next: () => {
                    this.loadingTickets = false;
                    this.hasAttemptedLoad = true;
                },
                error: () => {
                    this.loadingTickets = false;
                    this.hasAttemptedLoad = true; // Evitar re-intentos infinitos ante errores 429 persistentes
                }
            });
        }
        return this.ticketsSignal.asReadonly();
    }

    getTicketsByGroup(groupId: number | string) {
        return this.ticketsSignal().filter(t => t.groupId === groupId);
    }

    getTicket(id: number | string) {
        return this.ticketsSignal().find(t => t.id == id);
    }

    createTicket(ticketData: any): Observable<any> {
        const payload = {
            titulo: ticketData.titulo,
            descripcion: ticketData.descripcion,
            grupo_id: ticketData.groupId,
            estado_id: ticketData.estadoId, 
            prioridad_id: ticketData.prioridadId,
            fecha_final: ticketData.fechaLimite,
            asignado_id: ticketData.asignadoId 
        };
        
        return this.http.post<any>(`${API_URL}/tickets`, payload).pipe(tap(() => this.loadTickets().subscribe()));
    }

    updateTicket(id: number | string, updates: any): Observable<any> {
        const payload: any = {};
        if (updates.titulo) payload.titulo = updates.titulo;
        if (updates.descripcion) payload.descripcion = updates.descripcion;
        if (updates.estadoId) payload.estado_id = updates.estadoId;
        if (updates.prioridadId) payload.prioridad_id = updates.prioridadId;
        if (updates.asignadoId) payload.asignado_id = updates.asignadoId;
        if (updates.fechaLimite) payload.fecha_final = updates.fechaLimite;

        return this.http.put<any>(`${API_URL}/tickets/${id}`, payload).pipe(tap(() => this.loadTickets().subscribe()));
    }

    addComment(id: number | string, autor: string, texto: string): Observable<any> {
        return this.http.post<any>(`${API_URL}/comentarios/ticket/${id}`, { contenido: texto }).pipe(tap(() => this.loadTickets().subscribe()));
    }

    deleteTicket(id: number | string): Observable<any> {
        return this.http.delete<any>(`${API_URL}/tickets/${id}`).pipe(tap(() => this.loadTickets().subscribe()));
    }

    loadComentarios(ticketId: string): Observable<any[]> {
        return this.http.get<any>(`${API_URL}/comentarios/ticket/${ticketId}`).pipe(
            map(res => res.data.comentarios.map((c: any) => ({
                id: c.id,
                texto: c.contenido,
                autor: c.autor_nombre || c.autor_username,
                fecha: c.creado_en
            })))
        );
    }

    loadHistorial(ticketId: string): Observable<any[]> {
         return this.http.get<any>(`${API_URL}/historial/ticket/${ticketId}`).pipe(
             map(res => res.data.historial)
         );
    }
}
