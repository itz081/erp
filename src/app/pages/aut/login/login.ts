import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CardModule } from 'primeng/card';
import { FloatLabelModule } from 'primeng/floatlabel';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../services/user.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        RouterLink,
        ReactiveFormsModule,
        CommonModule,
        ButtonModule,
        InputTextModule,
        PasswordModule,
        CardModule,
        FloatLabelModule,
        DividerModule,
        ToastModule,
    ],
    providers: [MessageService],
    templateUrl: './login.html',
})
export class LoginPage {
    loginForm: FormGroup;
    loading = signal(false);

    // Credenciales del administrador por defecto
    private readonly adminEmail = 'admin@admin.com';
    private readonly adminPassword = 'Admin123!';

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private messageService: MessageService,
        private userService: UserService
    ) {
        this.loginForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required]]
        });
    }

    onLogin() {
        if (this.loginForm.invalid) {
            this.loginForm.markAllAsTouched();
            return;
        }

        const { email, password } = this.loginForm.value;
        this.loading.set(true);

        setTimeout(() => {
            const user = this.userService.validateCredentials(email, password);

            if (user) {
                this.userService.setCurrentUser(user);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Bienvenido',
                    detail: `Hola, ${user.fullName}!`,
                });
                setTimeout(() => {
                    this.loading.set(false);
                    this.router.navigate(['/home']);
                }, 1000);
            } else {
                this.loading.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error de acceso',
                    detail: 'Credenciales incorrectas.',
                });
            }
        }, 1000);
    }
}
