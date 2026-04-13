import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TicketService } from '../../services/ticket.service';
import { GroupService } from '../../services/group.service';
import { UserService, UserProfile } from '../../services/user.service';

@Component({
    selector: 'app-ticket-create',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, CardModule, InputTextModule, TextareaModule, SelectModule, DatePickerModule, ButtonModule, ToastModule],
    providers: [MessageService],
    templateUrl: './ticket-create.html',
    styles: []
})
export class TicketCreateComponent implements OnInit {
    fb = inject(FormBuilder);
    ticketService = inject(TicketService);
    groupService = inject(GroupService);
    userService = inject(UserService);
    router = inject(Router);
    route = inject(ActivatedRoute);
    messageService = inject(MessageService);

    ticketForm!: FormGroup;

    prioridades = computed(() => this.ticketService.prioridades());
    estados = computed(() => this.ticketService.estados());
    groups = computed(() => this.groupService.groups());

    allUsers = computed(() => this.userService.getUsers()());

    filteredUsers = signal<any[]>([]);

    ngOnInit() {
        // Verificar permisos
        const user = this.userService.getCurrentUser()();
        const canAdd = user?.permisoBase === 'admin' || (user?.ticketPermissions?.canAdd ?? false);
        if (!canAdd) {
            this.messageService.add({ severity: 'error', summary: 'Acceso Denegado', detail: 'No tienes permisos para crear tickets.' });
            this.router.navigate(['/home/dashboard']);
            return;
        }

        this.ticketForm = this.fb.group({
            titulo: ['', [Validators.required, Validators.minLength(5)]],
            descripcion: ['', [Validators.required, Validators.minLength(10)]],
            estadoId: [null, Validators.required],
            prioridadId: [null, Validators.required],
            groupId: [null, Validators.required],
            asignadoId: [null, Validators.required],
            fechaLimite: [null, Validators.required]
        });

        // Cargar catálogos y poner defaults precisos
        this.ticketService.loadCatalogs().subscribe(() => {
            const pendiente = this.estados().find(e => e.nombre === 'PENDIENTE');
            const media = this.prioridades().find(p => p.nombre === 'MEDIA');
            if (pendiente) this.ticketForm.patchValue({ estadoId: pendiente.id });
            if (media) this.ticketForm.patchValue({ prioridadId: media.id });
        });

        // Al cambiar de grupo, filtrar los usuarios para mostrar solo miembros del grupo
        this.ticketForm.get('groupId')?.valueChanges.subscribe(groupId => {
            if (groupId) {
                this.groupService.loadGroupById(groupId).subscribe(group => {
                    const miembros = group?.miembros || [];
                    this.filteredUsers.set(miembros);
                    
                    // Si el usuario asignado actualmente no está en el nuevo grupo, resetearlo
                    const currentAsig = this.ticketForm.get('asignadoId')?.value;
                    if (currentAsig && !miembros.find((m: any) => m.id === currentAsig.id)) {
                        this.ticketForm.patchValue({ asignadoId: null });
                    }
                });
            } else {
                this.filteredUsers.set([]);
            }
        });

        this.route.queryParams.subscribe(params => {
            if (params['groupId']) {
                // El ID ahora es UUID (string)
                this.ticketForm.patchValue({ groupId: params['groupId'] });
            }
        });
    }

    onSubmit() {
        if (this.ticketForm.invalid) {
            this.ticketForm.markAllAsTouched();
            this.messageService.add({ severity: 'error', summary: 'Campos faltantes', detail: 'Por favor, completa/corrige todos los campos obligatorios.' });
            return;
        }

        const formValues = this.ticketForm.value;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        if (formValues.fechaLimite && formValues.fechaLimite < now) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'La fecha límite no puede ser anterior a hoy' });
            return;
        }

        const newTicketData = {
            titulo: formValues.titulo,
            descripcion: formValues.descripcion,
            groupId: formValues.groupId,
            asignadoId: formValues.asignadoId.id, // El objeto del p-select tiene .id
            estadoId: formValues.estadoId,
            prioridadId: formValues.prioridadId,
            fechaLimite: formValues.fechaLimite
        };

        this.ticketService.createTicket(newTicketData).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Ticket creado exitosamente y guardado en la base de datos' });
                setTimeout(() => {
                    this.router.navigate(['/home/groups', formValues.groupId]);
                }, 1000);
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el ticket en la base de datos' });
            }
        });
    }

    cancel() {
        this.router.navigate(['/home/dashboard']);
    }
}
