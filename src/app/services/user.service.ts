import { Injectable } from '@angular/core';

export interface UserProfile {
    username: string;
    fullName: string;
    email: string;
    phone: string;
    address: string;
    birthDate: string;
    password: string;
    groupIds?: number[];
}

const STORAGE_KEY = 'registered_user';

@Injectable({
    providedIn: 'root',
})
export class UserService {

    saveProfile(profile: UserProfile): void {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    }

    getProfile(): UserProfile | null {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    }

    clearProfile(): void {
        localStorage.removeItem(STORAGE_KEY);
    }
}
