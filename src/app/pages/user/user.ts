import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { AvatarModule } from 'primeng/avatar';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { DatePickerModule } from 'primeng/datepicker';
import { ChipModule } from 'primeng/chip';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';

import { UserService, UserProfile } from '../../services/user.service';
import { GroupService } from '../../services/group.service';
import { TicketService } from '../../services/ticket.service';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [
    CommonModule, CardModule, AvatarModule, DividerModule, TagModule, MessageModule,
    ButtonModule, ToastModule, InputTextModule, FloatLabelModule, DatePickerModule,
    ReactiveFormsModule, TooltipModule, ChipModule, SkeletonModule
  ],
  providers: [MessageService],
  templateUrl: './user.html',
  styleUrl: './user.css',
})
export class UserComponent implements OnInit {
  userService = inject(UserService);
  groupService = inject(GroupService);
  ticketService = inject(TicketService);
  fb = inject(FormBuilder);
  messageService = inject(MessageService);
  router = inject(Router);

  // Perfil reactivo desde signal
  profile = this.userService.getCurrentUser();

  editMode = false;
  saving = signal(false);
  editForm!: FormGroup;

  /** Grupos a los que pertenece el usuario actual */
  userGroups = computed(() => {
    const user = this.profile();
    if (!user) return [];
    // Desde el backend, /auth/me no retorna grupos directamente.
    // Los obtenemos filtrando los grupos cargados por miembros.
    const allGroups = this.groupService.groups();
    return allGroups.filter(g =>
      g.miembros?.some((m: any) => m.username === user.username || m.id === user.id)
    );
  });

  /** Tickets asignados al usuario actual */
  userTickets = computed(() => {
    const user = this.profile();
    if (!user) return [];
    const isAdmin = user.permisoBase === 'admin';
    const all = this.ticketService.tickets();
    if (isAdmin) return all;
    return all.filter(t => t.asignadoId === user.id || t.asignadoA === user.username);
  });

  ngOnInit(): void {
    // Cargar grupos con miembros para poder filtrar
    this.groupService.loadGroupsWithMembers();
    this.initForm();
  }

  initForm(): void {
    const p = this.profile();
    this.editForm = this.fb.group({
      fullName: [p?.fullName ?? '', [Validators.required]],
      phone: [p?.phone ?? '', [Validators.required, Validators.pattern('^[0-9]+$')]],
      address: [p?.address ?? '', [Validators.required]],
    });
  }

  toggleEditMode(): void {
    this.editMode = !this.editMode;
    if (this.editMode) {
      this.initForm();
    }
  }

  saveProfile(): void {
    if (this.editForm.invalid) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Por favor complete todos los campos correctamente.' });
      return;
    }

    const current = this.profile();
    if (!current) return;

    const updated: UserProfile = {
      ...current,
      fullName: this.editForm.value.fullName,
      phone: this.editForm.value.phone,
      address: this.editForm.value.address,
    };

    this.saving.set(true);
    this.userService.saveProfile(updated).subscribe({
      next: () => {
        this.saving.set(false);
        this.editMode = false;
        this.messageService.add({ severity: 'success', summary: '¡Listo!', detail: 'Perfil actualizado correctamente.' });
      },
      error: (err) => {
        this.saving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el perfil.' });
      }
    });
  }

  deleteProfile(): void {
    if (confirm('¿Estás seguro de que deseas eliminar tu perfil de forma permanente?')) {
      this.userService.clearProfile();
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Sesión cerrada.' });
      setTimeout(() => this.router.navigate(['/']), 1500);
    }
  }

  navigateToGroup(groupId: number): void {
    this.router.navigate(['/home/groups', groupId]);
  }

  navigateToTicket(ticketId: number): void {
    this.router.navigate(['/home/tickets', ticketId]);
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }
}
