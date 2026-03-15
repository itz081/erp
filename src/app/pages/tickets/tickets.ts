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

@Component({
    selector: 'app-tickets',
    standalone: true,
    imports: [CommonModule, CardModule, TableModule, ButtonModule, ToolbarModule, TagModule, ConfirmDialogModule, ToastModule],
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
        return user?.permisoBase === 'admin' || (user?.permissions?.canAdd ?? false);
    });
    canDelete = computed(() => {
        const user = this.userService.getCurrentUser()();
        return user?.permisoBase === 'admin' || (user?.permissions?.canDelete ?? false);
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
}
