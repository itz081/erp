import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { UserService } from '../../services/user.service';
import { GroupService } from '../../services/group.service';
import { TicketService } from '../../services/ticket.service';
import { Group } from '../../models/group.model';

import { DataViewModule } from 'primeng/dataview';

@Component({
  selector: 'app-group',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TagModule, CardModule, DividerModule,
    TableModule, ButtonModule, ToolbarModule, DialogModule, InputTextModule,
    SelectModule, ToastModule, ConfirmDialogModule, DataViewModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './group.html',
  styleUrl: './group.css',
})
export class GroupComponent implements OnInit {
  private userService = inject(UserService);
  private groupService = inject(GroupService);
  private ticketService = inject(TicketService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);

  groups = computed(() => {
    const gs = this.groupService.groups();
    const ts = this.ticketService.tickets();
    return gs.map(g => ({
        ...g,
        tickets: ts.filter((t: any) => t.groupId === g.id)
    }));
  });
  canAdd = computed(() => {
    const user: any = this.userService.getCurrentUser()();
    return user?.permisoBase === 'admin' || (user?.groupPermissions?.canAdd ?? user?.permissions?.canAdd ?? false);
  });
  canEdit = computed(() => {
    const user: any = this.userService.getCurrentUser()();
    return user?.permisoBase === 'admin' || (user?.groupPermissions?.canEdit ?? user?.permissions?.canEdit ?? false);
  });
  canDelete = computed(() => {
    const user: any = this.userService.getCurrentUser()();
    return user?.permisoBase === 'admin' || (user?.groupPermissions?.canDelete ?? user?.permissions?.canDelete ?? false);
  });

  groupItem: Partial<Group> = {};
  groupDialog: boolean = false;
  submitted: boolean = false;

  categoryOptions = [
    { label: 'Tecnología', value: 'Tecnología' },
    { label: 'Negocios', value: 'Negocios' },
    { label: 'Educación', value: 'Educación' },
    { label: 'Entretenimiento', value: 'Entretenimiento' }
  ];

  levelOptions = [
    { label: 'Principiante', value: 'Principiante' },
    { label: 'Intermedio', value: 'Intermedio' },
    { label: 'Avanzado', value: 'Avanzado' }
  ];

  saving = false;

  ngOnInit() {
    // Force reload groups every time this page is visited
    this.groupService.loadGroups().subscribe();
  }

  openNew() {
    this.groupItem = { nombre: '', categoria: 'Tecnología', nivel: 'Principiante', autor: '', miembros: [] };
    this.submitted = false;
    this.groupDialog = true;
  }

  editGroup(group: Group) {
    this.groupItem = { ...group };
    this.groupDialog = true;
  }

  viewGroup(group: Group) {
    this.router.navigate(['/home/groups', group.id]);
  }

  deleteGroup(group: Group) {
    this.confirmationService.confirm({
      message: '¿Estás seguro de que deseas eliminar el grupo ' + group.nombre + '?',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.groupService.deleteGroup(group.id).subscribe(() => {
          this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Grupo eliminado correctamente', life: 3000 });
        });
      }
    });
  }

  hideDialog() {
    this.groupDialog = false;
    this.submitted = false;
  }

  saveGroup() {
    if (this.saving) return;
    this.submitted = true;
    if (this.groupItem.nombre?.trim()) {
      this.saving = true;
      if (this.groupItem.id) {
        this.groupService.updateGroup(this.groupItem as any).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Grupo modificado correctamente', life: 3000 });
            this.groupDialog = false;
            this.groupItem = {};
            this.saving = false;
          },
          error: (err) => { 
              this.saving = false; 
              const msg = err.error?.error || 'No se pudo actualizar el grupo';
              this.messageService.add({ severity: 'error', summary: 'Error', detail: msg, life: 3000 });
          }
        });
      } else {
        this.groupService.createGroup(this.groupItem).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Grupo añadido correctamente', life: 3000 });
            this.groupDialog = false;
            this.groupItem = {};
            this.saving = false;
          },
          error: (err) => { 
              this.saving = false; 
              const msg = err.error?.error || 'No se pudo crear el grupo';
              this.messageService.add({ severity: 'error', summary: 'Error', detail: msg, life: 3000 });
          }
        });
      }
    } else {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'El nombre es obligatorio', life: 3000 });
    }
  }

  N_get() {
    return this.groups().length;
  }
}
