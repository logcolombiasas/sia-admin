// authz.service.ts (standalone)
import { Injectable, signal } from '@angular/core';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';

@Injectable({ providedIn: 'root' })
export class AuthzService {
    groups = signal<string[]>([]);
    email = signal<string | undefined>(undefined);

    async refresh() {
        try {
            const user = await getCurrentUser();
            this.email.set(user.signInDetails?.loginId);
            const session = await fetchAuthSession();
            const payload = session.tokens?.idToken?.payload as any;
            const groups: string[] = payload?.['cognito:groups'] ?? [];
            this.groups.set(groups);
            return groups;
        } catch {
            this.groups.set([]);
            this.email.set(undefined);
            return [];
        }
    }

    has(group: string) { return this.groups().includes(group); }
    any(...roles: string[]) { return roles.some(r => this.has(r)); }
    all(...roles: string[]) { return roles.every(r => this.has(r)); }

    async getUser(){
        return await getCurrentUser();
    }

}