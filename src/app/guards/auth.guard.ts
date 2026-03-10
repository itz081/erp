import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { UserService } from '../services/user.service';

export const authGuard: CanActivateFn = (route, state) => {
    const userService = inject(UserService);
    const router = inject(Router);
    const user = userService.getProfile();

    if (user) {
        return true;
    }

    // Si no está logueado, redirigir al login
    router.navigate(['/']);
    return false;
};
