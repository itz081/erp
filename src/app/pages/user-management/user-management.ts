import { Component, computed, inject } from '@angular/core';
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
        ConfirmDialogModule
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './user-management.html'
})
export class UserManagementComponent {
    private userService = inject(UserService);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);

    // Filter out the current logged-in user from the list
    users = computed(() => {
        const currentUser = this.userService.getCurrentUser()();
        return this.userService.getUsers()().filter(u => u.email !== currentUser?.email);
    });
    
    permisosBaseLista: { label: string, value: PermisoBase }[] = [
        { label: 'Administrador', value: 'admin' },
        { label: 'User', value: 'user' }
    ];

    displayAddDialog = false;
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

    onPermisoChange(user: UserProfile, event: any) {
        const newPermiso: PermisoBase = event.value;
        this.userService.updateUserPermisoBase(user.email, newPermiso);
        this.messageService.add({
            severity: 'success',
            summary: 'Permiso base actualizado',
            detail: `El usuario ${user.fullName} ahora es ${newPermiso === 'admin' ? 'Administrador' : 'User'}`
        });
    }

    onPermissionChange(user: UserProfile) {
        if (user.groupPermissions && user.ticketPermissions) {
            this.userService.updateUserPermissions(user.email, user.groupPermissions, user.ticketPermissions);
            this.messageService.add({
                severity: 'success',
                summary: 'Permisos actualizados',
                detail: `Permisos de ${user.fullName} guardados correctamente.`
            });
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

        this.userService.saveProfile(this.newUser as UserProfile);
        this.messageService.add({severity: 'success', summary: 'Éxito', detail: 'Usuario creado correctamente'});
        this.displayAddDialog = false;
    }

    getPermisoSeverity(permiso: PermisoBase) {
        return permiso === 'admin' ? 'success' : 'info';
    }
}
