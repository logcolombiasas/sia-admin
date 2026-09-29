import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';
import { AuthzService } from '../services/auth/authz.service';

export function requireRoles(...roles: string[]): CanMatchFn {
    return async () => {
        const authz = inject(AuthzService);
        await authz.refresh(); // asegura grupos frescos
        return roles.includes('*') || authz.any(...roles);
    };
}
