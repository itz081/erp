import { Ticket } from './ticket.model';

export interface Group {
    id: number;
    nombre: string;
    categoria?: string;
    nivel?: string;
    autor?: string;
    descripcion?: string;
    miembros: { username: string; email: string; avatar?: string }[];
    tickets: Ticket[];
}
