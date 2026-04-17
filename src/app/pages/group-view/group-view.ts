import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { DragDropModule } from 'primeng/dragdrop';
import { SelectButtonModule } from 'primeng/selectbutton';
import { AvatarModule } from 'primeng/avatar';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { TicketService } from '../../services/ticket.service';
import { GroupService } from '../../services/group.service';
import { UserService } from '../../services/user.service';
import { Ticket } from '../../models/ticket.model';

@Component({
  selector: 'app-group-view',
  standalone: true,
  imports: [
    CommonModule, 
    CardModule, 
    TableModule, 
    ToolbarModule, 
    ButtonModule, 
    DialogModule, 
    FormsModule, 
    TooltipModule,
    TagModule,
    ToastModule,
    DragDropModule,
    SelectButtonModule,
    AvatarModule,
    DividerModule
  ],
  providers: [MessageService],
  templateUrl: './group-view.html',
  styleUrl: './group-view.css'
})
export class GroupViewComponent implements OnInit {
  ticketService = inject(TicketService);
  groupService = inject(GroupService);
  userService = inject(UserService);
  messageService = inject(MessageService);
  route = inject(ActivatedRoute);
  router = inject(Router);

  groupId = signal<string>('');
  isKanban = false;
  draggedTicket: any = null;

  groupTickets = computed(() => this.ticketService.getTicketsByGroup(this.groupId()));
  group = computed(() => this.groupService.getGroup(this.groupId()));
  
  // Catálogos reactivos
  estados = this.ticketService.estados;

  previewTicket: Ticket | null = null;
  displayPreview = false;

  viewMode = 'list';
  viewOptions = [
    { icon: 'pi pi-list', value: 'list' },
    { icon: 'pi pi-th-large', value: 'kanban' }
  ];

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['id'];
      this.groupId.set(id);
      this.groupService.loadGroupById(id).subscribe();
      this.ticketService.loadTickets().subscribe();
      this.ticketService.loadCatalogs().subscribe();
    });
  }

  getTicketsByStatus(statusId: string) {
    return this.groupTickets().filter(t => t.estadoId === statusId);
  }

  openPreview(ticket: Ticket) {
    this.previewTicket = ticket;
    this.displayPreview = true;
  }

  viewFullDetail(id: string | number) {
    this.router.navigate(['/home/tickets', id]);
  }

  canManageMembers(): boolean {
    const user = this.userService.getCurrentUser()();
    if (!user) return false;
    return user.permisoBase === 'admin' || (user.groupPermissions?.canAddMember || user.groupPermissions?.canDeleteMember || false);
  }

  manageGroup() {
    this.router.navigate(['/home/groups/manage', this.groupId()]);
  }

  canAddTicket(): boolean {
    const user: any = this.userService.getCurrentUser()();
    if (!user) return false;
    return user.permisoBase === 'admin' || (user.ticketPermissions?.canAdd ?? user.permissions?.canAdd ?? false);
  }

  createTicketInGroup() {
    this.router.navigate(['/home/tickets/create'], { queryParams: { groupId: this.groupId() } });
  }
  
  dragStart(ticket: any) {
    const user: any = this.userService.getCurrentUser()();
    const isAdmin = user?.permisoBase === 'admin';
    const isAsignado = ticket.asignadoId === user?.id || ticket.asignadoA === user?.username;

    const groupPerms = user?.groupPermissions;
    const ticketPerms = user?.ticketPermissions;
    const hasAllGroupPerms = groupPerms?.canAdd && groupPerms?.canEdit && groupPerms?.canDelete && groupPerms?.canComment && groupPerms?.canAddMember && groupPerms?.canDeleteMember;
    const hasAllTicketPerms = ticketPerms?.canAdd && ticketPerms?.canEdit && ticketPerms?.canDelete;
    const hasAllPerms = hasAllGroupPerms && hasAllTicketPerms;

    if (isAdmin || isAsignado || hasAllPerms) {
      this.draggedTicket = ticket;
    } else {
      this.draggedTicket = null;
      this.messageService.add({
        severity: 'error',
        summary: 'Acceso Denegado',
        detail: 'Solo el usuario asignado o alguien con todos los permisos puede mover este ticket.'
      });
    }
  }

  dragEnd() {
    this.draggedTicket = null;
  }

  drop(statusId: string) {
    if (this.draggedTicket && this.draggedTicket.estadoId !== statusId) {
      const ticketId = this.draggedTicket.id;
      this.ticketService.updateTicket(ticketId, { estadoId: statusId }).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Actualizado',
            detail: 'Estado de ticket actualizado correctamente.'
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar el estado del ticket.'
          });
        }
      });
    }
  }

  getSeverity(prioridad: string): any {
    const p = prioridad?.toUpperCase() || '';
    if (p.includes('ALTA')) return 'danger';
    if (p.includes('MEDIA')) return 'warning';
    return 'info';
  }

  getPriorityHex(prioridad: string): string {
    const p = prioridad?.toUpperCase() || '';
    if (p.includes('ALTA')) return '#ef4444';
    if (p.includes('MEDIA')) return '#f59e0b';
    return '#3b82f6';
  }
}
