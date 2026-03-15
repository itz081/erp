import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { UserService } from '../services/user.service';

export const permisoGuard: CanActivateFn = (route, state) => {
    const userService = inject(UserService);
    const router = inject(Router);
    const user = userService.getProfile();

    if (user && user.permisoBase === 'admin') {
        return true;
    }

    // Si no es admin, redirigir al dashboard
    router.navigate(['/home/dashboard']);
    return false;
};
