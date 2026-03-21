import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { FieldsetModule } from 'primeng/fieldset';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { TimelineModule } from 'primeng/timeline';
import { TableModule } from 'primeng/table';
import { ToolbarModule } from 'primeng/toolbar';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TicketService } from '../../services/ticket.service';
import { GroupService } from '../../services/group.service';
import { UserService } from '../../services/user.service';

@Component({
    selector: 'app-ticket-detail',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule, CardModule, FieldsetModule, InputTextModule, TextareaModule, SelectModule, DatePickerModule, ButtonModule, TimelineModule, TableModule, ToolbarModule, ToastModule, ConfirmDialogModule],
    providers: [MessageService, ConfirmationService],
    templateUrl: './ticket-detail.html',
    styles: []
})
export class TicketDetailComponent implements OnInit {
    fb = inject(FormBuilder);
    ticketService = inject(TicketService);
    groupService = inject(GroupService);
    route = inject(ActivatedRoute);
    router = inject(Router);
    messageService = inject(MessageService);
    confirmationService = inject(ConfirmationService);
    userService = inject(UserService);

    ticketId = signal<number>(0);
    ticket = computed(() => this.ticketService.getTicket(this.ticketId()));
    canEdit = computed(() => {
        const user = this.userService.getCurrentUser()();
        return user?.permisoBase === 'admin' || (user?.ticketPermissions?.canEdit ?? user?.permissions?.canEdit ?? false);
    });
    canDelete = computed(() => {
        const user = this.userService.getCurrentUser()();
        return user?.permisoBase === 'admin' || (user?.ticketPermissions?.canDelete ?? user?.permissions?.canDelete ?? false);
    });
    canComment = computed(() => {
        const user = this.userService.getCurrentUser()();
        return user?.permisoBase === 'admin' || (user?.groupPermissions?.canComment ?? user?.permissions?.canComment ?? false);
    });
    isAdmin = computed(() => this.userService.getCurrentUser()()?.permisoBase === 'admin');

    editMode = false;
    ticketForm!: FormGroup;

    prioridades = ['Baja', 'Media', 'Alta'];
    estados = ['Pendiente', 'En progreso', 'Revision', 'Finalizado'];
    groupMembers = computed(() => {
        const t = this.ticket();
        if (t) {
            const g = this.groupService.getGroup(t.groupId);
            return g ? g.miembros : [];
        }
        return [];
    });

    newCommentText = '';

    ngOnInit() {
        this.route.params.subscribe(params => {
            this.ticketId.set(Number(params['id']));
            this.initForm();
        });
    }

    initForm() {
        const t = this.ticket();
        if (t) {
            this.ticketForm = this.fb.group({
                titulo: [t.titulo, [Validators.required, Validators.minLength(5)]],
                descripcion: [t.descripcion, [Validators.required, Validators.minLength(10)]],
                estado: [t.estado, Validators.required],
                prioridad: [t.prioridad, Validators.required],
                asignadoA: [this.groupMembers().find(m => m.username === t.asignadoA) || t.asignadoA, Validators.required],
                fechaLimite: [t.fechaLimite ? new Date(t.fechaLimite) : null, Validators.required]
            });
            this.ticketForm.disable();
        }
    }

    toggleEdit() {
        this.editMode = !this.editMode;
        if (this.editMode) {
            this.ticketForm.enable();
        } else {
            this.initForm();
        }
    }

    saveChanges() {
        if (this.ticketForm.invalid) {
            this.ticketForm.markAllAsTouched();
            this.messageService.add({ severity: 'error', summary: 'Campos faltantes', detail: 'Por favor, completa/corrige todos los campos obligatorios.' });
            return;
        }
        const formValues = this.ticketForm.value;
        const updates = {
            ...formValues,
            asignadoA: typeof formValues.asignadoA === 'string' ? formValues.asignadoA : formValues.asignadoA.username
        };

        this.ticketService.updateTicket(this.ticketId(), updates);
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Ticket actualizado' });
        this.editMode = false;
        this.ticketForm.disable();
    }

    addComment() {
        if (!this.canComment()) {
            this.messageService.add({ severity: 'error', summary: 'Acceso Denegado', detail: 'No tienes permiso para comentar.' });
            return;
        }
        const user = this.userService.getProfile();
        if (this.newCommentText.trim() && user) {
            this.ticketService.addComment(this.ticketId(), user.fullName, this.newCommentText);
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Comentario añadido' });
            this.newCommentText = '';
        }
    }

    goBack() {
        const t = this.ticket();
        if (t) {
            this.router.navigate(['/home/groups', t.groupId]);
        } else {
            this.router.navigate(['/home/dashboard']);
        }
    }

    deleteTicket() {
        this.confirmationService.confirm({
            message: '¿Estás seguro de eliminar este ticket permanentemente?',
            header: 'Confirmación',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.ticketService.deleteTicket(this.ticketId());
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Ticket eliminado' });
                this.router.navigate(['/home/tickets']);
            }
        });
    }
}
