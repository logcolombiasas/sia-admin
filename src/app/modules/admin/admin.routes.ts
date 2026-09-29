import { Routes } from '@angular/router';
import { Admin } from './admin';
import { requireRoles } from '../../guards/roles.guard';

export const routes: Routes = [
    {
        path: '',
        component: Admin,
        children: [
            {
                path: '',
                canMatch: [requireRoles('*')],
                loadComponent: () => import('./views/home/home').then(m => m.Home)
            },
            {
                path: 'plates',
                canMatch: [requireRoles('admin')],
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./views/plates/plates').then(m => m.Plates)
                    },
                    {
                        path: 'detections',
                        loadComponent: () => import('./views/plates/detections/detections').then(m => m.Detections)
                    },
                    {
                        path: 'readings',
                        loadComponent: () => import('./views/plates/readings/readings').then(m => m.Readings)
                    },
                    {
                        path: 'sightings',
                        loadComponent: () => import('./views/plates/sightings/sightings').then(m => m.Sightings)
                    }
                ]
            },
            {
                path: '**',
                redirectTo: '',
                pathMatch: 'full'
            }
        ]
    }
];
