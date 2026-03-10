import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { PanelMenuModule } from 'primeng/panelmenu';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { MenuItem } from 'primeng/api';

import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, PanelMenuModule, DividerModule, TagModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class SidebarComponent implements OnInit {
  appVersion = '1.0.0';
  items: MenuItem[] = [];

  constructor(private router: Router, private userService: UserService) { }

  ngOnInit() {
    this.items = [
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
        label: 'Tickets',
        icon: 'pi pi-ticket',
        routerLink: ['/home/tickets'],
      },
      {
        label: 'User',
        icon: 'pi pi-user',
        routerLink: ['/home/user'],
      },
      {
        separator: true
      },
      {
        label: 'Cerrar sesión',
        icon: 'pi pi-sign-out',
        command: () => {
          this.userService.clearProfile();
          this.router.navigate(['/']);
        }
      }
    ];
  }
}
