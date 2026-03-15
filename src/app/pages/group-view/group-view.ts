import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from 'primeng/dragdrop';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TicketService } from '../../services/ticket.service';
import { GroupService } from '../../services/group.service';
import { UserService } from '../../services/user.service';
import { Ticket } from '../../models/ticket.model';

@Component({
    selector: 'app-group-view',
    standalone: true,
    imports: [CommonModule, CardModule, TableModule, ToolbarModule, ButtonModule, ToggleButtonModule, DialogModule, FormsModule, DragDropModule, ToastModule],
    providers: [MessageService],
    templateUrl: './group-view.html',
    styles: []
})
export class GroupViewComponent implements OnInit {
    ticketService = inject(TicketService);
    groupService = inject(GroupService);
    route = inject(ActivatedRoute);
    router = inject(Router);

    groupId = signal<number>(0);
    isKanban = false;

    groupTickets = computed(() => this.ticketService.getTicketsByGroup(this.groupId()));
    group = computed(() => this.groupService.getGroup(this.groupId()));

    statuses = ['Pendiente', 'En progreso', 'Revision', 'Finalizado'];

    previewTicket: Ticket | null = null;
    displayPreview = false;

    ngOnInit() {
        this.route.params.subscribe(params => {
            this.groupId.set(Number(params['id']));
        });
    }

    getTicketsByStatus(status: string) {
        return this.groupTickets().filter(t => t.estado === status);
    }

    openPreview(ticket: Ticket) {
        this.previewTicket = ticket;
        this.displayPreview = true;
    }

    viewFullDetail(id: number) {
        this.router.navigate(['/home/tickets', id]);
    }

    manageGroup() {
        this.router.navigate(['/home/groups/manage', this.groupId()]);
    }

    draggedTicket: Ticket | null = null;
    messageService = inject(MessageService);
    userService = inject(UserService);

    canMoveTicket(ticket: Ticket): boolean {
        const user: any = this.userService.getCurrentUser()();
        if (!user) return false;
        if (user.permisoBase === 'admin') return true;
        return ticket.asignadoA === user.username;
    }

    dragStart(ticket: Ticket) {
        if (this.canMoveTicket(ticket)) {
            this.draggedTicket = ticket;
        } else {
            this.draggedTicket = null;
            this.messageService.add({ 
                severity: 'error', 
                summary: 'Permiso Denegado', 
                detail: 'Solo el administrador o el usuario asignado pueden mover este ticket de estado.', 
                life: 3000 
            });
        }
    }

    dragEnd() {
        this.draggedTicket = null;
    }

    drop(event: any, newStatus: string) {
        if (this.draggedTicket && this.draggedTicket.estado !== newStatus) {
            // Update the ticket status using TicketService
            this.ticketService.updateTicket(this.draggedTicket.id, { estado: newStatus as Ticket['estado'] });
        }
        this.draggedTicket = null;
    }
}
