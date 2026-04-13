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

    ticketId = signal<string>('');
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

    prioridades = computed(() => this.ticketService.prioridades());
    estados = computed(() => this.ticketService.estados());
    groupMembers = computed(() => {
        const t = this.ticket();
        if (t) {
            const g = this.groupService.getGroup(t.groupId);
            return g ? g.miembros : [];
        }
        return [];
    });

    comments = signal<any[]>([]);
    history = signal<any[]>([]);
    newCommentText = '';

    ngOnInit() {
        this.route.params.subscribe(params => {
            const id = params['id'];
            this.ticketId.set(id);
            this.initForm();
            this.loadExtraInfo(id);
        });
    }

    loadExtraInfo(id: string) {
        this.ticketService.loadComentarios(id).subscribe(c => this.comments.set(c));
        this.ticketService.loadHistorial(id).subscribe(h => this.history.set(h));
    }

    initForm() {
        const t = this.ticket();
        if (t) {
            this.ticketForm = this.fb.group({
                titulo: [t.titulo, [Validators.required, Validators.minLength(5)]],
                descripcion: [t.descripcion, [Validators.required, Validators.minLength(10)]],
                estadoId: [t.estadoId, Validators.required],
                prioridadId: [t.prioridadId, Validators.required],
                asignadoId: [this.userService.getUsers()().find((u: any) => u.id === t.asignadoId) || null, Validators.required],
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
            titulo: formValues.titulo,
            descripcion: formValues.descripcion,
            estadoId: formValues.estadoId,
            prioridadId: formValues.prioridadId,
            asignadoId: formValues.asignadoId.id,
            fechaLimite: formValues.fechaLimite
        };

        this.ticketService.updateTicket(this.ticketId(), updates).subscribe(() => {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Ticket actualizado' });
            this.editMode = false;
            this.ticketForm.disable();
        });
    }

    addComment() {
        if (!this.canComment()) {
            this.messageService.add({ severity: 'error', summary: 'Acceso Denegado', detail: 'No tienes permiso para comentar.' });
            return;
        }
        const user = this.userService.getCurrentUser()();
        if (this.newCommentText.trim() && user) {
            this.ticketService.addComment(this.ticketId(), user.fullName || user.username, this.newCommentText).subscribe(() => {
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Comentario añadido' });
                this.newCommentText = '';
                this.loadExtraInfo(this.ticketId());
            });
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
                this.ticketService.deleteTicket(this.ticketId()).subscribe(() => {
                    this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Ticket eliminado' });
                    const t = this.ticket();
                    if (t) {
                        this.router.navigate(['/home/groups', t.groupId]);
                    } else {
                        this.router.navigate(['/home/tickets']);
                    }
                });
            }
        });
    }
}
