import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../../components/header/header';

@Component({
    selector: 'app-main-layout',
    standalone: true,
    imports: [RouterOutlet, HeaderComponent],
    templateUrl: './main-layout.html',
    styleUrl: './main-layout.css',
})
export class MainLayoutComponent { }
