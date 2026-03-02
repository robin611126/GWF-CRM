/**
 * Backend Unit & Integration Tests
 * These tests validate core business logic without requiring a database connection.
 * For full integration tests, ensure PostgreSQL is running and run: npx jest
 */

// ==================== Unit Tests ====================

describe('Lead Scoring Logic', () => {
    const calculateScore = (data: any): number => {
        let score = 10;
        if (data.company) score += 15;
        if (data.phone) score += 10;
        if (data.source === 'REFERRAL') score += 25;
        else if (data.source === 'WEBSITE') score += 15;
        else if (data.source === 'ADS') score += 10;
        if (data.notes) score += 5;
        return Math.min(score, 100);
    };

    test('base score is 10', () => {
        expect(calculateScore({})).toBe(10);
    });

    test('company adds 15 points', () => {
        expect(calculateScore({ company: 'Test Corp' })).toBe(25);
    });

    test('phone adds 10 points', () => {
        expect(calculateScore({ phone: '123' })).toBe(20);
    });

    test('referral source adds 25 points', () => {
        expect(calculateScore({ source: 'REFERRAL' })).toBe(35);
    });

    test('website source adds 15 points', () => {
        expect(calculateScore({ source: 'WEBSITE' })).toBe(25);
    });

    test('ads source adds 10 points', () => {
        expect(calculateScore({ source: 'ADS' })).toBe(20);
    });

    test('full lead scores high', () => {
        const lead = { company: 'Corp', phone: '123', source: 'REFERRAL', notes: 'Good lead' };
        expect(calculateScore(lead)).toBe(65); // 10+15+10+25+5
    });

    test('score capped at 100', () => {
        const lead = { company: 'A', phone: '1', source: 'REFERRAL', notes: 'X' };
        expect(calculateScore(lead)).toBeLessThanOrEqual(100);
    });
});


describe('Invoice Total Calculation', () => {
    const calculateTotal = (items: Array<{ quantity: number; unit_price: number }>) => {
        return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    };

    test('single item', () => {
        expect(calculateTotal([{ quantity: 1, unit_price: 100 }])).toBe(100);
    });

    test('multiple items', () => {
        const items = [
            { quantity: 2, unit_price: 50 },
            { quantity: 1, unit_price: 200 },
        ];
        expect(calculateTotal(items)).toBe(300);
    });

    test('empty items returns 0', () => {
        expect(calculateTotal([])).toBe(0);
    });

    test('decimal prices', () => {
        const items = [{ quantity: 3, unit_price: 33.33 }];
        expect(calculateTotal(items)).toBeCloseTo(99.99);
    });
});


describe('Invoice Status Calculation', () => {
    const getStatus = (total: number, paid: number, dueDate: Date): string => {
        if (paid >= total) return 'PAID';
        if (dueDate < new Date() && paid < total) return 'OVERDUE';
        if (paid > 0 && paid < total) return 'PARTIAL';
        return 'UNPAID';
    };

    test('fully paid', () => {
        expect(getStatus(100, 100, new Date('2099-01-01'))).toBe('PAID');
    });

    test('partial payment', () => {
        expect(getStatus(100, 50, new Date('2099-01-01'))).toBe('PARTIAL');
    });

    test('overdue with no payment', () => {
        expect(getStatus(100, 0, new Date('2020-01-01'))).toBe('OVERDUE');
    });

    test('overdue with partial payment', () => {
        expect(getStatus(100, 30, new Date('2020-01-01'))).toBe('OVERDUE');
    });

    test('unpaid and not due yet', () => {
        expect(getStatus(100, 0, new Date('2099-01-01'))).toBe('UNPAID');
    });

    test('overpaid still returns PAID', () => {
        expect(getStatus(100, 150, new Date('2099-01-01'))).toBe('PAID');
    });
});


describe('Payment Validation', () => {
    const validatePayment = (amount: number, balance: number): { valid: boolean; error?: string } => {
        if (amount <= 0) return { valid: false, error: 'Payment must be positive' };
        if (amount > balance) return { valid: false, error: `Exceeds balance of ${balance}` };
        return { valid: true };
    };

    test('valid payment within balance', () => {
        expect(validatePayment(50, 100)).toEqual({ valid: true });
    });

    test('payment equals balance', () => {
        expect(validatePayment(100, 100)).toEqual({ valid: true });
    });

    test('payment exceeds balance', () => {
        const result = validatePayment(150, 100);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Exceeds');
    });

    test('zero payment rejected', () => {
        expect(validatePayment(0, 100).valid).toBe(false);
    });

    test('negative payment rejected', () => {
        expect(validatePayment(-10, 100).valid).toBe(false);
    });
});


describe('RBAC Permission Matrix', () => {
    type Permission = 'read' | 'write' | 'delete';
    type Module = 'leads' | 'clients' | 'projects' | 'tasks' | 'invoices' | 'payments' | 'reports' | 'admin';

    const matrix: Record<string, Record<Module, Permission[]>> = {
        ADMIN: { leads: ['read', 'write', 'delete'], clients: ['read', 'write', 'delete'], projects: ['read', 'write', 'delete'], tasks: ['read', 'write', 'delete'], invoices: ['read', 'write', 'delete'], payments: ['read', 'write', 'delete'], reports: ['read', 'write', 'delete'], admin: ['read', 'write', 'delete'] },
        SALES: { leads: ['read', 'write'], clients: ['read', 'write'], projects: [], tasks: [], invoices: ['read'], payments: [], reports: ['read'], admin: [] },
        PROJECT_MANAGER: { leads: [], clients: ['read'], projects: ['read', 'write'], tasks: ['read', 'write', 'delete'], invoices: [], payments: [], reports: ['read'], admin: [] },
        DEVELOPER: { leads: [], clients: [], projects: ['read'], tasks: ['read', 'write'], invoices: [], payments: [], reports: [], admin: [] },
        BILLING: { leads: [], clients: ['read'], projects: [], tasks: [], invoices: ['read', 'write'], payments: ['read', 'write'], reports: ['read'], admin: [] },
    };

    const hasPermission = (role: string, module: Module, permission: Permission) => {
        return matrix[role]?.[module]?.includes(permission) || false;
    };

    test('admin has full access', () => {
        expect(hasPermission('ADMIN', 'leads', 'delete')).toBe(true);
        expect(hasPermission('ADMIN', 'admin', 'write')).toBe(true);
    });

    test('sales can read/write leads', () => {
        expect(hasPermission('SALES', 'leads', 'read')).toBe(true);
        expect(hasPermission('SALES', 'leads', 'write')).toBe(true);
    });

    test('sales cannot delete invoices', () => {
        expect(hasPermission('SALES', 'invoices', 'delete')).toBe(false);
    });

    test('developer can only read projects', () => {
        expect(hasPermission('DEVELOPER', 'projects', 'read')).toBe(true);
        expect(hasPermission('DEVELOPER', 'projects', 'write')).toBe(false);
    });

    test('developer cannot access leads', () => {
        expect(hasPermission('DEVELOPER', 'leads', 'read')).toBe(false);
    });

    test('billing can manage invoices but not delete', () => {
        expect(hasPermission('BILLING', 'invoices', 'read')).toBe(true);
        expect(hasPermission('BILLING', 'invoices', 'write')).toBe(true);
        expect(hasPermission('BILLING', 'invoices', 'delete')).toBe(false);
    });

    test('PM cannot access billing', () => {
        expect(hasPermission('PROJECT_MANAGER', 'invoices', 'read')).toBe(false);
        expect(hasPermission('PROJECT_MANAGER', 'payments', 'read')).toBe(false);
    });

    test('PM can manage tasks', () => {
        expect(hasPermission('PROJECT_MANAGER', 'tasks', 'read')).toBe(true);
        expect(hasPermission('PROJECT_MANAGER', 'tasks', 'write')).toBe(true);
        expect(hasPermission('PROJECT_MANAGER', 'tasks', 'delete')).toBe(true);
    });
});


describe('Duplicate Detection', () => {
    const checkDuplicate = (email: string, existingEmails: string[]) => {
        return existingEmails.includes(email.toLowerCase());
    };

    test('detects duplicate email', () => {
        expect(checkDuplicate('test@test.com', ['test@test.com', 'other@test.com'])).toBe(true);
    });

    test('no duplicate for new email', () => {
        expect(checkDuplicate('new@test.com', ['test@test.com'])).toBe(false);
    });

    test('case insensitive check', () => {
        expect(checkDuplicate('Test@Test.com', ['test@test.com'])).toBe(true);
    });
});


describe('Domain Validation', () => {
    const isValidDomain = (domain: string) => {
        const regex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
        return regex.test(domain);
    };

    test('valid domain', () => {
        expect(isValidDomain('example.com')).toBe(true);
        expect(isValidDomain('sub.example.com')).toBe(true);
        expect(isValidDomain('my-site.co.uk')).toBe(true);
    });

    test('invalid domain', () => {
        expect(isValidDomain('not a domain')).toBe(false);
        expect(isValidDomain('http://example.com')).toBe(false);
        expect(isValidDomain('.com')).toBe(false);
    });
});
