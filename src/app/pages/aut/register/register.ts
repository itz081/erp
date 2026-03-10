import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
    FormBuilder,
    FormGroup,
    Validators,
    ReactiveFormsModule,
    AbstractControl,
    ValidationErrors,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CardModule } from 'primeng/card';
import { FloatLabelModule } from 'primeng/floatlabel';
import { DividerModule } from 'primeng/divider';
import { DatePickerModule } from 'primeng/datepicker';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../services/user.service';

import { Directive, ElementRef, HostListener } from '@angular/core';
@Directive({
    selector: '[appTrimOnBlur]',
    standalone: true   // si usas standalone components
})
export class TrimOnBlurDirective {
    constructor(private el: ElementRef) { }

    @HostListener('blur') onBlur() {
        const input = this.el.nativeElement as HTMLInputElement;
        if (input.value) {
            input.value = input.value.trim();
            input.dispatchEvent(new Event('input'));
        }
    }
}

@Component({
    selector: 'app-register',
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
        DatePickerModule,
        ToastModule,
        TrimOnBlurDirective,
    ],
    providers: [MessageService],
    templateUrl: './register.html',
})
export class RegisterPage {
    registerForm: FormGroup;
    loading = signal(false);

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private messageService: MessageService,
        private userService: UserService
    ) {
        this.registerForm = this.fb.group(
            {
                username: ['', [Validators.required]],
                fullName: ['', [Validators.required]],
                email: ['', [Validators.required, Validators.email]],
                password: [
                    '',
                    [
                        Validators.required,
                        Validators.minLength(10),
                        this.passwordSymbolValidator,
                    ],
                ],
                confirmPassword: ['', [Validators.required]],
                address: ['', [Validators.required]],
                phone: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
                birthDate: ['', [Validators.required, this.ageValidator]],
            },
            { validators: this.matchPasswordValidator }
        );
    }

    // Validador de símbolos especiales para contraseña
    passwordSymbolValidator(control: AbstractControl): ValidationErrors | null {
        const value = control.value;
        const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(value);
        return !hasSymbol ? { noSymbol: true } : null;
    }

    // Validador de mayoría de edad (18+)
    ageValidator(control: AbstractControl): ValidationErrors | null {
        if (!control.value) return null;
        const birthDate = new Date(control.value);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age < 18 ? { underAge: true } : null;
    }

    // Validador de coincidencia de contraseñas
    matchPasswordValidator(control: AbstractControl): ValidationErrors | null {
        const password = control.get('password');
        const confirmPassword = control.get('confirmPassword');
        if (password && confirmPassword && password.value !== confirmPassword.value) {
            confirmPassword.setErrors({ mismatch: true });
            return { mismatch: true };
        }
        return null;
    }

    onRegister() {
        if (this.registerForm.invalid) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Formulario Inválido',
                detail: 'Por favor complete correctamente todos los campos.',
            });
            return;
        }

        this.loading.set(true);
        setTimeout(() => {
            // Guardar perfil en el servicio (localStorage)
            const { username, fullName, email, phone, address, birthDate, password } = this.registerForm.value;
            this.userService.saveProfile({ 
                username, 
                fullName, 
                email, 
                phone, 
                address, 
                birthDate, 
                password,
                role: 'reader', // Default role
                permissions: {
                    canAdd: false,
                    canEdit: false,
                    canDelete: false,
                    canComment: false
                }
            });

            this.loading.set(false);
            this.messageService.add({
                severity: 'success',
                summary: 'Registro Exitoso',
                detail: 'Cuenta creada correctamente.',
            });
            setTimeout(() => this.router.navigate(['/']), 1500);
        }, 1500);
    }
}
