import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { MenuItem } from 'primeng/api';
import { UserService } from '../../services/user.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, MenubarModule, ButtonModule, AvatarModule],
  template: `
    <div class="card border-none border-noround shadow-2 mb-4">
      <p-menubar [model]="items">
        <ng-template pTemplate="start">
          <div class="flex align-items-center gap-2 px-3 mr-4" (click)="router.navigate(['/home'])" style="cursor: pointer">
            <i class="pi pi-shield text-primary text-3xl"></i>
            <span class="text-xl font-bold text-900">SecureApp</span>
          </div>
        </ng-template>
        <ng-template pTemplate="end">
          <div class="flex align-items-center gap-3">
             <div class="flex flex-column align-items-end mr-2 hidden md:flex">
                <span class="font-bold text-900">{{ currentUser()?.fullName || currentUser()?.username }}</span>
                <span class="text-xs text-600">{{ currentUser()?.permisoBase | titlecase }}</span>
             </div>
             <p-avatar [label]="(currentUser()?.username?.charAt(0) || 'U').toUpperCase()" shape="circle" styleClass="bg-primary text-white" />
             <p-button icon="pi pi-sign-out" [rounded]="true" [text]="true" severity="danger" (onClick)="logout()" pTooltip="Cerrar Sesión" />
          </div>
        </ng-template>
      </p-menubar>
    </div>
  `,
})
export class HeaderComponent implements OnInit {
  items: MenuItem[] = [];
  userService = inject(UserService);
  router = inject(Router);
  currentUser = this.userService.getCurrentUser();

  constructor() {
    effect(() => {
      const user = this.currentUser();
      this.buildMenu(user?.permisoBase);
    });
  }

  ngOnInit() {}

  private buildMenu(permisoBase?: string) {
    const baseItems: MenuItem[] = [
      {
        label: 'Dashboard',
        icon: 'pi pi-home',
        routerLink: ['/home/dashboard'],
      },
      {
        label: 'Grupos',
        icon: 'pi pi-users',
        routerLink: ['/home/group'],
      },
      {
        label: 'Perfil',
        icon: 'pi pi-user',
        routerLink: ['/home/user'],
      }
    ];

    if (permisoBase === 'admin') {
      baseItems.push({
        label: 'Administración',
        icon: 'pi pi-cog',
        items: [
          {
            label: 'Gestión Usuarios',
            icon: 'pi pi-users',
            routerLink: ['/home/users-management'],
          }
        ]
      });
    }

    this.items = baseItems;
  }

  logout() {
    this.userService.clearProfile();
    this.router.navigate(['/']);
  }
}
