export interface Ticket {
    id: number;
    titulo: string;
    descripcion: string;
    estado: 'Pendiente' | 'En progreso' | 'Revision' | 'Finalizado';
    asignadoA: string;
    prioridad: 'Baja' | 'Media' | 'Alta';
    fechaCreacion: Date;
    fechaLimite: Date | null;
    comentarios: { autor: string; texto: string; fecha: Date }[];
    historialCambios: { cambio: string; fecha: Date }[];
    groupId: number;
}
