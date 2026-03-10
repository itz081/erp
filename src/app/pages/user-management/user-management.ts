import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService, UserProfile, UserRole } from '../../services/user.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';

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
        CheckboxModule
    ],
    providers: [MessageService],
    templateUrl: './user-management.html'
})
export class UserManagementComponent {
    private userService = inject(UserService);
    private messageService = inject(MessageService);

    // Filter out the current logged-in user from the list
    users = computed(() => {
        const currentUser = this.userService.getCurrentUser()();
        return this.userService.getUsers()().filter(u => u.email !== currentUser?.email);
    });
    
    roles: { label: string, value: UserRole }[] = [
        { label: 'Administrador', value: 'admin' },
        { label: 'Lector', value: 'reader' }
    ];

    onRoleChange(user: UserProfile, event: any) {
        const newRole: UserRole = event.value;
        this.userService.updateUserRole(user.email, newRole);
        this.messageService.add({
            severity: 'success',
            summary: 'Rol actualizado',
            detail: `El usuario ${user.fullName} ahora es ${newRole === 'admin' ? 'Administrador' : 'Lector'}`
        });
    }

    onPermissionChange(user: UserProfile) {
        this.userService.updateUserPermissions(user.email, user.permissions);
        this.messageService.add({
            severity: 'success',
            summary: 'Permisos actualizados',
            detail: `Permisos de ${user.fullName} guardados correctamente.`
        });
    }

    getRoleSeverity(role: UserRole) {
        return role === 'admin' ? 'success' : 'info';
    }
}
