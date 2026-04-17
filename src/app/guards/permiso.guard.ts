import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { UserService } from '../services/user.service';

export const permisoGuard: CanActivateFn = (route, state) => {
    const userService = inject(UserService);
    const router = inject(Router);
    const user = userService.getProfile();

    if (!user) {
        router.navigate(['/']);
        return false;
    }

    if (user.permisoBase === 'admin') {
        return true;
    }

    if (state.url.includes('/tickets/create')) {
        if (user.ticketPermissions?.canAdd || user.permissions?.canAdd) return true;
    }

    if (state.url.includes('/users-management')) {
    }

    router.navigate(['/home/dashboard']);
    return false;
};
