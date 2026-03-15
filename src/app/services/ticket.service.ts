import { Injectable, signal, PLATFORM_ID, inject, forwardRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Ticket } from '../models/ticket.model';
import { GroupService } from './group.service';

const TICKETS_KEY = 'tickets_data_list';

@Injectable({
    providedIn: 'root'
})
export class TicketService {
    private ticketsSignal = signal<Ticket[]>([]);
    private platformId = inject(PLATFORM_ID);
    private groupService = inject(forwardRef(() => GroupService));

    constructor() {
        if (isPlatformBrowser(this.platformId)) {
            this.loadTickets();
        }
    }

    private loadTickets() {
        const raw = localStorage.getItem(TICKETS_KEY);
        if (raw) {
            const loaded = JSON.parse(raw);
            // Re-convert dates back to Date objects
            const sanitized = loaded.map((t: any) => ({
                ...t,
                fechaCreacion: new Date(t.fechaCreacion),
                fechaLimite: t.fechaLimite ? new Date(t.fechaLimite) : null,
                comentarios: t.comentarios.map((c: any) => ({ ...c, fecha: new Date(c.fecha) })),
                historialCambios: t.historialCambios.map((h: any) => ({ ...h, fecha: new Date(h.fecha) }))
            }));
            this.ticketsSignal.set(sanitized);
        } else {
            const initialTickets: Ticket[] = [
                {
                    id: 1,
                    titulo: 'Fix UI Bug in Dashboard',
                    descripcion: 'The card component is overflowing on mobile screens',
                    estado: 'Pendiente',
                    asignadoA: 'admin',
                    prioridad: 'Alta',
                    fechaCreacion: new Date('2026-03-01'),
                    fechaLimite: new Date('2026-03-10'),
                    comentarios: [],
                    historialCambios: [{ cambio: 'Ticket creado', fecha: new Date() }],
                    groupId: 1
                }
            ];
            this.ticketsSignal.set(initialTickets);
            this.saveTickets();
        }
    }

    private saveTickets() {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem(TICKETS_KEY, JSON.stringify(this.ticketsSignal()));
        }
    }

    get tickets() {
        return this.ticketsSignal.asReadonly();
    }

    getTicketsByGroup(groupId: number) {
        return this.ticketsSignal().filter(t => t.groupId === groupId);
    }

    getTicket(id: number) {
        return this.ticketsSignal().find(t => t.id === id);
    }

    createTicket(ticketData: Omit<Ticket, 'id' | 'fechaCreacion' | 'comentarios' | 'historialCambios'>) {
        const nextId = this.ticketsSignal().length > 0 ? Math.max(...this.ticketsSignal().map(t => t.id)) + 1 : 1;
        const newTicket: Ticket = {
            ...ticketData,
            id: nextId,
            fechaCreacion: new Date(),
            comentarios: [],
            historialCambios: [{ cambio: 'Ticket creado', fecha: new Date() }]
        };
        this.ticketsSignal.update(ts => [...ts, newTicket]);
        this.saveTickets();
        return newTicket;
    }

    updateTicket(id: number, updates: Partial<Ticket>) {
        this.ticketsSignal.update(ts => ts.map(t => {
            if (t.id === id) {
                return {
                    ...t,
                    ...updates,
                    historialCambios: [...t.historialCambios, { cambio: 'Ticket modificado', fecha: new Date() }]
                };
            }
            return t;
        }));
        this.saveTickets();
    }

    addComment(id: number, autor: string, texto: string) {
        this.ticketsSignal.update(ts => ts.map(t => {
            if (t.id === id) {
                return {
                    ...t,
                    comentarios: [...t.comentarios, { autor, texto, fecha: new Date() }]
                };
            }
            return t;
        }));
        this.saveTickets();
    }

    deleteTicket(id: number) {
        this.ticketsSignal.update(ts => ts.filter(t => t.id !== id));
        this.saveTickets();
    }
}
