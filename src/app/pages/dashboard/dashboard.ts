import { Component, OnInit, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { TicketService } from '../../services/ticket.service';
import { GroupService } from '../../services/group.service';
import { UserService } from '../../services/user.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, CardModule, ChartModule, TableModule, ButtonModule, TagModule, SkeletonModule],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
    ticketService = inject(TicketService);
    groupService = inject(GroupService);
    userService = inject(UserService);
    router = inject(Router);

    currentUser = this.userService.getCurrentUser();

    isAdmin = computed(() => this.currentUser()?.permisoBase === 'admin');

    /** Grupos del usuario actual */
    userGroups = computed(() => {
        const user = this.currentUser();
        if (!user) return [];
        const allGroups = this.groupService.groups();
        if (this.isAdmin()) return allGroups;
        return allGroups.filter(g =>
            g.miembros?.some((m: any) => m.username === user.username || m.id === user.id)
        );
    });

    /** Tickets del usuario actual */
    userTickets = computed(() => {
        const user = this.currentUser();
        if (!user) return [];
        const all = this.ticketService.tickets();
        if (this.isAdmin()) return all;
        return all.filter(t => t.asignadoId === user.id || t.asignadoA === user.username);
    });

    /** Grupos con sus tickets para la tabla */
    groupsWithTickets = computed(() => {
        const ts = this.userTickets();
        return this.userGroups().map(g => ({
            ...g,
            totalTickets: ts.filter(t => t.groupId === g.id).length,
        }));
    });

    stats = computed(() => {
        const tickets = this.userTickets();
        const grupos = this.userGroups();
        return {
            total: tickets.length,
            pendientes: tickets.filter(t => t.estado?.toLowerCase().includes('pendiente')).length,
            enProgreso: tickets.filter(t => t.estado?.toLowerCase().includes('curso') || t.estado?.toLowerCase().includes('progreso')).length,
            revision: tickets.filter(t => t.estado?.toLowerCase().includes('revision') || t.estado?.toLowerCase().includes('revisión')).length,
            finalizados: tickets.filter(t => t.estado?.toLowerCase().includes('terminado') || t.estado?.toLowerCase().includes('final')).length,
            grupos: grupos.length,
        };
    });

    chartData: any;
    chartOptions: any;

    constructor() {
        effect(() => {
            this.buildChart();
        });
    }

    ngOnInit() {
        this.groupService.loadGroupsWithMembers();
    }

    private buildChart() {
        const tickets = this.userTickets();
        const allEstados = this.ticketService.estados();

        if (allEstados.length > 0) {
            const labels = allEstados.map((e: any) => e.nombre);
            const data = allEstados.map((e: any) =>
                tickets.filter(t => t.estado?.toLowerCase() === e.nombre?.toLowerCase()).length
            );
            const colors = allEstados.map((e: any) => e.color || '#6366f1');

            this.chartData = {
                labels,
                datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#ffffff' }]
            };
        } else {
            const statuses = ['Pendiente', 'En progreso', 'Revisión', 'Finalizado'];
            this.chartData = {
                labels: statuses,
                datasets: [{
                    data: statuses.map(s => tickets.filter(t => t.estado?.toLowerCase().includes(s.split(' ')[0].toLowerCase())).length),
                    backgroundColor: ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            };
        }

        this.chartOptions = {
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#6b7280', padding: 16, font: { size: 12 } }
                }
            },
            responsive: true,
            maintainAspectRatio: false,
        };
    }

    getEstadoSeverity(estado: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
        const s = estado?.toLowerCase() || '';
        if (s.includes('final')) return 'success';
        if (s.includes('progreso')) return 'info';
        if (s.includes('revision') || s.includes('revisión')) return 'warn';
        return 'secondary';
    }

    getPrioridadSeverity(prioridad: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
        const p = prioridad?.toLowerCase() || '';
        if (p.includes('alta') || p.includes('crítica') || p.includes('critica')) return 'danger';
        if (p.includes('media')) return 'warn';
        return 'secondary';
    }

    viewTicket(id: number) {
        this.router.navigate(['/home/tickets', id]);
    }

    viewGroup(id: number) {
        this.router.navigate(['/home/groups', id]);
    }
}
