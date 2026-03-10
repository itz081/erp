import { Injectable, signal } from '@angular/core';
import { Ticket } from '../models/ticket.model';

@Injectable({
    providedIn: 'root'
})
export class TicketService {
    private ticketsSignal = signal<Ticket[]>([
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
        },
        {
            id: 2,
            titulo: 'Update PrimeNG',
            descripcion: 'We need to upgrade library versions to get recent features.',
            estado: 'En progreso',
            asignadoA: 'admin',
            prioridad: 'Media',
            fechaCreacion: new Date('2026-03-02'),
            fechaLimite: null,
            comentarios: [{ autor: 'admin', texto: 'Started upgrading.', fecha: new Date() }],
            historialCambios: [
                { cambio: 'Ticket creado', fecha: new Date() },
                { cambio: 'Estado cambiado a En progreso', fecha: new Date() }
            ],
            groupId: 1
        },
        {
            id: 3,
            titulo: 'Refactor Codebase',
            descripcion: 'Move away from CSS classes to pure PrimeNG components',
            estado: 'Revision',
            asignadoA: 'user1',
            prioridad: 'Baja',
            fechaCreacion: new Date('2026-03-03'),
            fechaLimite: new Date('2026-04-01'),
            comentarios: [],
            historialCambios: [{ cambio: 'Ticket creado', fecha: new Date() }],
            groupId: 2
        }
    ]);

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
    }

    deleteTicket(id: number) {
        this.ticketsSignal.update(ts => ts.filter(t => t.id !== id));
    }
}
