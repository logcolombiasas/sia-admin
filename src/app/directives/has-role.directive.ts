// has-role.directive.ts
import { Directive, Input, TemplateRef, ViewContainerRef, inject, OnDestroy } from '@angular/core';
import { effect } from '@angular/core';
import { AuthzService } from '../services/auth/authz.service';

@Directive({ selector: '[hasRole]', standalone: true })
export class HasRoleDirective implements OnDestroy {
    private tpl = inject(TemplateRef<any>);
    private vcr = inject(ViewContainerRef);
    private authz = inject(AuthzService);

    private roles: string[] = [];
    private cleanup = effect(() => {
        const show = this.roles.length ? (this.authz.any(...this.roles) || this.roles.includes('*') ) : false;
        this.vcr.clear();
        if (show) this.vcr.createEmbeddedView(this.tpl);
    });

    @Input() set hasRole(value: string | string[]) {
        this.roles = Array.isArray(value) ? value : [value];
    }

    ngOnDestroy() { this.cleanup.destroy(); }
}