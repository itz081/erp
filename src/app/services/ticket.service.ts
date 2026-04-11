import { Injectable, signal, PLATFORM_ID, inject, forwardRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { Ticket } from '../models/ticket.model';
import { GroupService } from './group.service';

const API_URL = 'http://localhost:3000/api';

@Injectable({
    providedIn: 'root'
})
export class TicketService {
    private ticketsSignal = signal<any[]>([]);
    private platformId = inject(PLATFORM_ID);
    private http = inject(HttpClient);
    private groupService = inject(forwardRef(() => GroupService));

    constructor() {
        if (isPlatformBrowser(this.platformId)) {
            // Carga inicial solo si hay token
            const token = localStorage.getItem('auth_token');
            if (token) {
                this.loadTickets().subscribe();
            }
        }
    }

    loadTickets(): Observable<any[]> {
        return this.http.get<any>(`${API_URL}/tickets`).pipe(
            map(res => {
                const loaded = res.data.tickets;
                const sanitized = loaded.map((t: any) => ({
                    ...t,
                    id: t.id,
                    titulo: t.titulo,
                    descripcion: t.descripcion,
                    estado: t.estado || 'Pendiente',
                    prioridad: t.prioridad || 'Baja',
                    fechaCreacion: t.fecha_creacion ? new Date(t.fecha_creacion) : new Date(),
                    fechaLimite: t.fecha_limite ? new Date(t.fecha_limite) : null,
                    groupId: t.grupo_id, // alias for frontend
                    asignadoA: t.asignado_a || '',
                    comentarios: [], // se cargarán bajo demanda o ajustar el backend
                    historialCambios: []
                }));
                this.ticketsSignal.set(sanitized);
                return sanitized;
            })
        );
    }

    private loadingTickets = false;

    get tickets() {
        if (this.ticketsSignal().length === 0 && !this.loadingTickets && isPlatformBrowser(this.platformId) && localStorage.getItem('auth_token')) {
            this.loadingTickets = true;
            this.loadTickets().subscribe({
                next: () => this.loadingTickets = false,
                error: () => this.loadingTickets = false
            });
        }
        return this.ticketsSignal.asReadonly();
    }

    getTicketsByGroup(groupId: number | string) {
        return this.ticketsSignal().filter(t => t.groupId === groupId);
    }

    getTicket(id: number | string) {
        return this.ticketsSignal().find(t => t.id === id);
    }

    createTicket(ticketData: any): void {
        const payload = {
            titulo: ticketData.titulo,
            descripcion: ticketData.descripcion,
            grupo_id: ticketData.groupId,
            estado: ticketData.estado || 'Pendiente',
            prioridad: ticketData.prioridad || 'Media',
            fecha_limite: ticketData.fechaLimite,
            asignado_a: ticketData.asignadoA
        };
        
        this.http.post<any>(`${API_URL}/tickets`, payload).subscribe(() => this.loadTickets().subscribe());
    }

    updateTicket(id: number | string, updates: any): void {
        // Formatear body para coincidir con DB
        const payload: any = {};
        if (updates.titulo) payload.titulo = updates.titulo;
        if (updates.descripcion) payload.descripcion = updates.descripcion;
        if (updates.estado) payload.estado = updates.estado;
        if (updates.prioridad) payload.prioridad = updates.prioridad;
        if (updates.asignadoA) payload.asignado_a = updates.asignadoA;
        if (updates.fechaLimite) payload.fecha_limite = updates.fechaLimite;

        this.http.put<any>(`${API_URL}/tickets/${id}`, payload).subscribe(() => this.loadTickets().subscribe());
    }

    addComment(id: number | string, autor: string, texto: string): void {
        this.http.post<any>(`${API_URL}/comentarios/ticket/${id}`, { texto }).subscribe(() => this.loadTickets().subscribe());
    }

    deleteTicket(id: number | string): void {
        this.http.delete<any>(`${API_URL}/tickets/${id}`).subscribe(() => this.loadTickets().subscribe());
    }

    loadComentarios(ticketId: string): Observable<any[]> {
        return this.http.get<any>(`${API_URL}/comentarios/ticket/${ticketId}`).pipe(
            map(res => res.data.comentarios)
        );
    }

    loadHistorial(ticketId: string): Observable<any[]> {
         return this.http.get<any>(`${API_URL}/historial/ticket/${ticketId}`).pipe(
             map(res => res.data.historial)
         );
    }
}
