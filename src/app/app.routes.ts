import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./pages/aut/login/login').then((m) => m.LoginPage),
    },
    {
        path: 'home',
        loadComponent: () =>
            import('./layouts/main-layout/main-layout').then((m) => m.MainLayoutComponent),
        children: [
            {
                path: '',
                loadComponent: () =>
                    import('./pages/landing/landing').then((m) => m.LandingPage),
            },
            {
                path: 'group',
                loadComponent: () =>
                    import('./pages/group/group').then((m) => m.GroupComponent),
            },
            {
                path: 'user',
                loadComponent: () =>
                    import('./pages/user/user').then((m) => m.UserComponent),
            },
            {
                path: 'dashboard',
                loadComponent: () =>
                    import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
            },
            {
                path: 'groups/manage/:id',
                loadComponent: () =>
                    import('./pages/group-manage/group-manage').then((m) => m.GroupManageComponent),
            },
            {
                path: 'groups/:id',
                loadComponent: () =>
                    import('./pages/group-view/group-view').then((m) => m.GroupViewComponent),
            },
            {
                path: 'tickets',
                loadComponent: () =>
                    import('./pages/tickets/tickets').then((m) => m.TicketsComponent),
            },
            {
                path: 'tickets/create',
                loadComponent: () =>
                    import('./pages/ticket-create/ticket-create').then((m) => m.TicketCreateComponent),
            },
            {
                path: 'tickets/:id',
                loadComponent: () =>
                    import('./pages/ticket-detail/ticket-detail').then((m) => m.TicketDetailComponent),
            }
        ],
    },
    {
        path: 'auth',
        children: [
            {
                path: 'login',
                redirectTo: '',
                pathMatch: 'full',
            },
            {
                path: 'register',
                loadComponent: () =>
                    import('./pages/aut/register/register').then((m) => m.RegisterPage),
            },
        ],
    },
    {
        path: '**',
        redirectTo: '',
    },
];
