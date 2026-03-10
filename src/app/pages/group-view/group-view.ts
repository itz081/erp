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
import { TicketService } from '../../services/ticket.service';
import { GroupService } from '../../services/group.service';
import { Ticket } from '../../models/ticket.model';

@Component({
    selector: 'app-group-view',
    standalone: true,
    imports: [CommonModule, CardModule, TableModule, ToolbarModule, ButtonModule, ToggleButtonModule, DialogModule, FormsModule],
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
}
