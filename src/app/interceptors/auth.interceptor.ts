import { HttpInterceptorFn } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  
  // Agregamos el token si está en localStorage y si estamos en el navegador
  if (isPlatformBrowser(platformId)) {
    const token = localStorage.getItem('auth_token');
    if (token) {
      const cloned = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true // también enviamos la cookie configurada por gateway
      });
      return next(cloned);
    }
  }
  
  const cloned = req.clone({ withCredentials: true });
  return next(cloned);
};
