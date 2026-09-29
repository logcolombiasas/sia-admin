import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadChildren: () => import('./modules/admin/admin.routes').then(r => r.routes)
    }
];