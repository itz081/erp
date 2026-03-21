import { Component, OnInit, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { TicketService } from '../../services/ticket.service';
import { GroupService } from '../../services/group.service';
import { UserService } from '../../services/user.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, CardModule, ChartModule, TableModule, SelectModule, ToolbarModule, ButtonModule, FormsModule],
    templateUrl: './dashboard.html',
    styles: []
})
export class DashboardComponent implements OnInit {
    ticketService = inject(TicketService);
    groupService = inject(GroupService);
    userService = inject(UserService);
    router = inject(Router);

    canAdd = computed(() => {
        const user: any = this.userService.getCurrentUser()();
        return user?.permisoBase === 'admin' || (user?.ticketPermissions?.canAdd ?? user?.permissions?.canAdd ?? false);
    });

    chartData: any;
    chartOptions: any;

    selectedGroup: any;
    groups = computed(() => {
        const currentUser = this.userService.getCurrentUser()();
        const isAdmin = currentUser?.permisoBase === 'admin';

        let gs = this.groupService.groups();
        if (!isAdmin) {
            gs = gs.filter(g => g.miembros.some((m: any) => m.username === currentUser?.username));
        }

        const ts = this.ticketService.tickets();
        return gs.map(g => ({
            ...g,
            tickets: ts.filter(t => t.groupId === g.id) 
        }));
    });
    
    allTickets = computed(() => {
        const user = this.userService.getCurrentUser()();
        const isAdmin = user?.permisoBase === 'admin';
        const ts = this.ticketService.tickets();
        if (isAdmin) {
            return ts;
        }
        return ts.filter(t => t.asignadoA === user?.username);
    });

    constructor() {
        effect(() => {
            this.updateChart();
        });
    }

    ngOnInit() {
    }

    updateChart() {
        const statuses = ['Pendiente', 'En progreso', 'Revision', 'Finalizado'];
        const data = statuses.map(status => this.allTickets().filter(t => t.estado === status).length);

        this.chartData = {
            labels: statuses,
            datasets: [
                {
                    data: data,
                    backgroundColor: [
                        '#93C5FD',
                        '#FDBA74',
                        '#60A5FA',
                        '#86EFAC'
                    ]
                }
            ]
        };
        this.chartOptions = {
            plugins: {
                legend: {
                    labels: {
                        color: '#495057'
                    }
                }
            }
        };
    }

    onGroupSelect(event: any) {
        if (event.value) {
            this.router.navigate(['/home/groups', event.value.id]);
        }
    }

    createTicket() {
        this.router.navigate(['/home/tickets/create']);
    }

    viewTicket(id: number) {
        this.router.navigate(['/home/tickets', id]);
    }
}
