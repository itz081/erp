import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService, UserProfile, PermisoBase } from '../../services/user.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';

@Component({
    selector: 'app-user-management',
    standalone: true,
    imports: [
        CommonModule, 
        TableModule, 
        ButtonModule, 
        SelectModule, 
        ToastModule, 
        CardModule, 
        TagModule,
        FormsModule,
        CheckboxModule,
        DialogModule,
        InputTextModule,
        ConfirmDialogModule,
        AvatarModule,
        TooltipModule,
        DividerModule
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './user-management.html'
})
export class UserManagementComponent {
    private userService = inject(UserService);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);

    users = computed(() => {
        const currentUser = this.userService.getCurrentUser()();
        return this.userService.getUsers()().filter(u => u.email !== currentUser?.email);
    });
    
    displayAddDialog = false;
    displayGroupPerms = false;
    displayTicketPerms = false;
    
    selectedUser: UserProfile | null = null;

    newUser: Partial<UserProfile> = {
        permisoBase: 'user',
        groupPermissions: {
            canAdd: false,
            canEdit: false,
            canDelete: false,
            canComment: true,
            canAddMember: false,
            canDeleteMember: false
        },
        ticketPermissions: {
            canAdd: false,
            canEdit: false,
            canDelete: false
        }
    };

    openGroupPerms(user: UserProfile) {
        // Deep clone to avoid immediate binding while editing
        this.selectedUser = JSON.parse(JSON.stringify(user));
        this.displayGroupPerms = true;
    }

    openTicketPerms(user: UserProfile) {
        this.selectedUser = JSON.parse(JSON.stringify(user));
        this.displayTicketPerms = true;
    }

    savePermissions() {
        if (this.selectedUser) {
            this.userService.updateUserPermissions(
                this.selectedUser.email, 
                this.selectedUser.groupPermissions!, 
                this.selectedUser.ticketPermissions!
            );
            // After saving to DB, we should refresh or rely on the service state
            // For now, the service updates local state too
            this.messageService.add({
                severity: 'success', 
                summary: 'Éxito', 
                detail: `Permisos de ${this.selectedUser.fullName} actualizados.`
            });
            this.displayGroupPerms = false;
            this.displayTicketPerms = false;
            
            // Re-load users to ensure UI is in sync
            this.userService.loadUsers().subscribe();
        }
    }

    deleteUser(user: UserProfile) {
        this.confirmationService.confirm({
            message: `¿Estás seguro de que deseas eliminar permanentemente a ${user.fullName}?`,
            header: 'Confirmar Eliminación',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.userService.deleteUser(user.email);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Usuario eliminado',
                    detail: `El usuario ${user.fullName} ha sido eliminado.`
                });
            }
        });
    }

    openAddDialog() {
        this.newUser = {
            username: '',
            fullName: '',
            email: '',
            password: 'User123!',
            permisoBase: 'user',
            phone: '',
            address: '',
            birthDate: '',
            groupPermissions: {
                canAdd: false,
                canEdit: false,
                canDelete: false,
                canComment: true,
                canAddMember: false,
                canDeleteMember: false
            },
            ticketPermissions: {
                canAdd: false,
                canEdit: false,
                canDelete: false
            }
        };
        this.displayAddDialog = true;
    }

    saveNewUser() {
        if (!this.newUser.username || !this.newUser.email || !this.newUser.fullName) {
            this.messageService.add({severity: 'error', summary: 'Error', detail: 'Por favor completa los campos básicos'});
            return;
        }

        const emailExists = this.userService.getUsers()().some(u => u.email === this.newUser.email);
        if (emailExists) {
            this.messageService.add({severity: 'error', summary: 'Error', detail: 'El email ya está registrado'});
            return;
        }

        this.userService.register(this.newUser as UserProfile).subscribe({
            next: () => {
                this.messageService.add({severity: 'success', summary: 'Éxito', detail: 'Usuario creado correctamente'});
                this.userService.loadUsers().subscribe();
                this.displayAddDialog = false;
            },
            error: (err) => {
                this.messageService.add({severity: 'error', summary: 'Error', detail: err.error?.error || 'No se pudo crear el usuario'});
            }
        });
    }
}
