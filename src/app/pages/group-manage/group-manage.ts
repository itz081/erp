import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { FormsModule } from '@angular/forms';
import { GroupService } from '../../services/group.service';
import { UserService, UserProfile } from '../../services/user.service';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
    selector: 'app-group-manage',
    standalone: true,
    imports: [CommonModule, CardModule, TableModule, ToolbarModule, ButtonModule, InputTextModule, SelectModule, ConfirmDialogModule, ToastModule, FormsModule],
    providers: [ConfirmationService, MessageService],
    templateUrl: './group-manage.html',
    styles: []
})
export class GroupManageComponent implements OnInit {
    groupService = inject(GroupService);
    userService = inject(UserService);
    route = inject(ActivatedRoute);
    router = inject(Router);
    confirmationService = inject(ConfirmationService);
    messageService = inject(MessageService);

    groupId = signal<number>(0);
    group = computed(() => this.groupService.getGroup(this.groupId()));
    
    // Get users that are NOT in the current group
    availableUsers = computed(() => {
        const members = this.group()?.miembros || [];
        return this.userService.getUsers()().filter(u => !members.some(m => m.email === u.email));
    });

    selectedUser: UserProfile | null = null;

    canAdd = computed(() => {
        const user = this.userService.getCurrentUser()();
        return user?.permisoBase === 'admin' || (user?.permissions?.canAdd ?? false);
    });

    canDelete = computed(() => {
        const user = this.userService.getCurrentUser()();
        return user?.permisoBase === 'admin' || (user?.permissions?.canDelete ?? false);
    });

    ngOnInit() {
        this.route.params.subscribe(params => {
            this.groupId.set(Number(params['id']));
        });
    }

    addUser() {
        if (this.selectedUser) {
            this.groupService.addUserToGroup(this.groupId(), this.selectedUser.username, this.selectedUser.email);
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Usuario añadido al grupo' });
            this.selectedUser = null;
        } else {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Por favor selecciona un usuario' });
        }
    }

    confirmRemoveUser(username: string) {
        this.confirmationService.confirm({
            message: `¿Estás seguro de eliminar a ${username} del grupo?`,
            header: 'Confirmación',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.groupService.removeUserFromGroup(this.groupId(), username);
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Usuario eliminado' });
            }
        });
    }

    goBack() {
        this.router.navigate(['/home/groups', this.groupId()]);
    }
}
