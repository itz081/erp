import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TicketService } from '../../services/ticket.service';
import { UserService } from '../../services/user.service';

import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';

@Component({
    selector: 'app-tickets',
    standalone: true,
    imports: [CommonModule, CardModule, TableModule, ButtonModule, ToolbarModule, TagModule, ConfirmDialogModule, ToastModule, AvatarModule, TooltipModule],
    providers: [MessageService, ConfirmationService],
    templateUrl: './tickets.html',
    styles: []
})
export class TicketsComponent {
    ticketService = inject(TicketService);
    router = inject(Router);
    confirmationService = inject(ConfirmationService);
    messageService = inject(MessageService);
    userService = inject(UserService);

    allTickets = computed(() => this.ticketService.tickets());
    canAdd = computed(() => {
        const user = this.userService.getCurrentUser()();
        return user?.permisoBase === 'admin' || (user?.ticketPermissions?.canAdd ?? user?.permissions?.canAdd ?? false);
    });
    canDelete = computed(() => {
        const user = this.userService.getCurrentUser()();
        return user?.permisoBase === 'admin' || (user?.ticketPermissions?.canDelete ?? user?.permissions?.canDelete ?? false);
    });
    isAdmin = computed(() => this.userService.getCurrentUser()()?.permisoBase === 'admin');

    createTicket() {
        this.router.navigate(['/home/tickets/create']);
    }

    viewTicket(id: number) {
        this.router.navigate(['/home/tickets', id]);
    }

    deleteTicket(id: number) {
        this.confirmationService.confirm({
            message: '¿Estás seguro de eliminar este ticket?',
            header: 'Confirmación',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.ticketService.deleteTicket(id);
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Ticket eliminado correctamente' });
            }
        });
    }

    getEstadoSeverity(estado: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
        const s = estado?.toLowerCase() || '';
        if (s.includes('final') || s.includes('terminado')) return 'success';
        if (s.includes('progreso') || s.includes('curso')) return 'info';
        if (s.includes('revision') || s.includes('revisión')) return 'warn';
        if (s.includes('pendiente')) return 'secondary';
        return 'contrast';
    }

    getPriorityColor(priority: string): string {
        const p = priority?.toLowerCase() || '';
        if (p.includes('alta') || p.includes('critica')) return 'bg-red-500';
        if (p.includes('media')) return 'bg-orange-500';
        return 'bg-blue-500';
    }

    isOverdue(date: any): boolean {
        if (!date) return false;
        return new Date(date) < new Date();
    }
}
