import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

type Permission = 'read' | 'write' | 'delete';
type Module = 'leads' | 'clients' | 'projects' | 'tasks' | 'invoices' | 'payments' | 'reports' | 'admin';

const permissionMatrix: Record<string, Record<Module, Permission[]>> = {
    ADMIN: {
        leads: ['read', 'write', 'delete'],
        clients: ['read', 'write', 'delete'],
        projects: ['read', 'write', 'delete'],
        tasks: ['read', 'write', 'delete'],
        invoices: ['read', 'write', 'delete'],
        payments: ['read', 'write', 'delete'],
        reports: ['read', 'write', 'delete'],
        admin: ['read', 'write', 'delete'],
    },
    SALES: {
        leads: ['read', 'write'],
        clients: ['read', 'write'],
        projects: [],
        tasks: [],
        invoices: ['read'],
        payments: [],
        reports: ['read'],
        admin: [],
    },
    PROJECT_MANAGER: {
        leads: [],
        clients: ['read'],
        projects: ['read', 'write'],
        tasks: ['read', 'write', 'delete'],
        invoices: [],
        payments: [],
        reports: ['read'],
        admin: [],
    },
    DEVELOPER: {
        leads: [],
        clients: [],
        projects: ['read'],
        tasks: ['read', 'write', 'delete'],
        invoices: [],
        payments: [],
        reports: [],
        admin: [],
    },
    BILLING: {
        leads: [],
        clients: ['read'],
        projects: [],
        tasks: [],
        invoices: ['read', 'write'],
        payments: ['read', 'write'],
        reports: ['read'],
        admin: [],
    },
};

export const authorize = (module: Module, permission: Permission) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        const userRole = req.user?.role;
        if (!userRole) {
            return res.status(403).json({ error: 'Access forbidden' });
        }

        const rolePermissions = permissionMatrix[userRole];
        if (!rolePermissions) {
            return res.status(403).json({ error: 'Access forbidden' });
        }

        const modulePermissions = rolePermissions[module];
        if (!modulePermissions || !modulePermissions.includes(permission)) {
            return res.status(403).json({ error: 'Access forbidden: insufficient permissions' });
        }

        next();
    };
};

export const authorizeRoles = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access forbidden: insufficient role' });
        }
        next();
    };
};
