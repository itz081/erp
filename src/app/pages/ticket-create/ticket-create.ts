import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
    messageService = inject(MessageService);

    ticketForm!: FormGroup;

    prioridades = ['Baja', 'Media', 'Alta'];
    estados = ['Pendiente', 'En progreso', 'Revision', 'Finalizado'];
    groups = computed(() => this.groupService.groups());

    assignableUsers: any[] = [];

    ngOnInit() {
        this.ticketForm = this.fb.group({
            titulo: ['', [Validators.required, Validators.minLength(5)]],
            descripcion: ['', [Validators.required, Validators.minLength(10)]],
            estado: ['Pendiente', Validators.required],
            prioridad: ['Media', Validators.required],
            groupId: [null, Validators.required],
            asignadoA: [null, Validators.required],
            fechaLimite: [null, Validators.required]
        });

        this.ticketForm.get('groupId')?.valueChanges.subscribe(groupId => {
            if (groupId) {
                const group = this.groupService.getGroup(groupId);
                const miembros = group ? group.miembros : [];
                const currentUser = this.userService.getCurrentUser()();

                if (currentUser?.permisoBase === 'admin') {
                    this.assignableUsers = miembros;
                } else if (currentUser) {
                    // Usuario regular: solo puede asignarse a sí mismo, siempre que sea miembro del grupo
                    const isMember = miembros.some((m: any) => m.username === currentUser.username);
                    this.assignableUsers = isMember ? [currentUser] : [];
                }

                if (this.assignableUsers.length > 0) {
                    this.ticketForm.patchValue({ asignadoA: this.assignableUsers[0] });
                } else {
                    this.ticketForm.patchValue({ asignadoA: null });
                }
            } else {
                this.assignableUsers = [];
                this.ticketForm.patchValue({ asignadoA: null });
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
            ...formValues,
            asignadoA: formValues.asignadoA.username,
        };

        this.ticketService.createTicket(newTicketData);
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Ticket creado exitosamente' });

        setTimeout(() => {
            this.router.navigate(['/home/groups', formValues.groupId]);
        }, 1000);
    }

    cancel() {
        this.router.navigate(['/home/dashboard']);
    }
}
