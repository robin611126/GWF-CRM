import prisma from '../../config/database';
import { NotFoundError, ConflictError } from '../../utils/errors';
import bcrypt from 'bcryptjs';

export class AdminService {
    // Service Plans
    async createPlan(data: any) {
        return prisma.servicePlan.create({ data });
    }

    async getPlans() {
        return prisma.servicePlan.findMany({ orderBy: { created_at: 'desc' } });
    }

    async updatePlan(id: string, data: any) {
        const plan = await prisma.servicePlan.findUnique({ where: { id } });
        if (!plan) throw new NotFoundError('Service Plan');
        return prisma.servicePlan.update({ where: { id }, data });
    }

    async deletePlan(id: string) {
        await prisma.servicePlan.delete({ where: { id } });
        return { message: 'Plan deleted' };
    }

    // Coupons
    async createCoupon(data: any) {
        const existing = await prisma.coupon.findUnique({ where: { code: data.code } });
        if (existing) throw new ConflictError('Coupon code already exists');
        // Clean empty strings and parse dates
        if (!data.valid_until || data.valid_until === '') {
            delete data.valid_until;
        } else if (typeof data.valid_until === 'string') {
            data.valid_until = new Date(data.valid_until);
        }
        return prisma.coupon.create({ data });
    }

    async getCoupons() {
        return prisma.coupon.findMany({ orderBy: { created_at: 'desc' } });
    }

    async updateCoupon(id: string, data: any) {
        return prisma.coupon.update({ where: { id }, data });
    }

    async deleteCoupon(id: string) {
        await prisma.coupon.delete({ where: { id } });
        return { message: 'Coupon deleted' };
    }

    // Tax
    async createTax(data: any) {
        if (data.is_default) {
            await prisma.taxConfig.updateMany({ data: { is_default: false } });
        }
        return prisma.taxConfig.create({ data });
    }

    async getTaxes() {
        return prisma.taxConfig.findMany({ orderBy: { created_at: 'desc' } });
    }

    async updateTax(id: string, data: any) {
        if (data.is_default) {
            await prisma.taxConfig.updateMany({ data: { is_default: false } });
        }
        return prisma.taxConfig.update({ where: { id }, data });
    }

    async deleteTax(id: string) {
        await prisma.taxConfig.delete({ where: { id } });
        return { message: 'Tax config deleted' };
    }

    // Currency
    async createCurrency(data: any) {
        if (data.is_default) {
            await prisma.currencyConfig.updateMany({ data: { is_default: false } });
        }
        return prisma.currencyConfig.create({ data });
    }

    async getCurrencies() {
        return prisma.currencyConfig.findMany({ orderBy: { created_at: 'desc' } });
    }

    async updateCurrency(id: string, data: any) {
        if (data.is_default) {
            await prisma.currencyConfig.updateMany({ data: { is_default: false } });
        }
        return prisma.currencyConfig.update({ where: { id }, data });
    }

    async deleteCurrency(id: string) {
        await prisma.currencyConfig.delete({ where: { id } });
        return { message: 'Currency config deleted' };
    }

    // Users
    async getUsers() {
        return prisma.user.findMany({
            select: { id: true, email: true, first_name: true, last_name: true, role: true, is_active: true, created_at: true },
            orderBy: { created_at: 'desc' },
        });
    }

    async createUser(data: { email: string; password: string; first_name: string; last_name: string; role?: string }) {
        const existing = await prisma.user.findUnique({ where: { email: data.email } });
        if (existing) throw new ConflictError('A user with this email already exists');
        const hash = await bcrypt.hash(data.password, 12);
        return prisma.user.create({
            data: {
                email: data.email,
                password_hash: hash,
                first_name: data.first_name,
                last_name: data.last_name,
                role: data.role || 'DEVELOPER',
            },
            select: { id: true, email: true, first_name: true, last_name: true, role: true, is_active: true, created_at: true },
        });
    }

    async updateUser(id: string, data: { role?: string; is_active?: boolean; first_name?: string; last_name?: string }) {
        return prisma.user.update({
            where: { id },
            data: data as any,
            select: { id: true, email: true, first_name: true, last_name: true, role: true, is_active: true },
        });
    }

    async resetUserPassword(id: string, newPassword: string) {
        const hash = await bcrypt.hash(newPassword, 12);
        await prisma.user.update({ where: { id }, data: { password_hash: hash } });
        return { message: 'Password reset successfully' };
    }

    // CSV Export
    async exportTable(table: string) {
        const validTables = ['users', 'leads', 'clients', 'projects', 'tasks', 'invoices', 'payments'];
        if (!validTables.includes(table)) {
            throw new NotFoundError(`Table '${table}'`);
        }

        const data = await (prisma as any)[table === 'users' ? 'user' :
            table === 'leads' ? 'lead' :
                table === 'clients' ? 'client' :
                    table === 'projects' ? 'project' :
                        table === 'tasks' ? 'task' :
                            table === 'invoices' ? 'invoice' :
                                'payment'].findMany();

        return data;
    }

    // Deleted Clients Management
    async getDeletedClients() {
        return prisma.client.findMany({
            where: { deleted_at: { not: null } },
            orderBy: { deleted_at: 'desc' },
            include: {
                _count: { select: { projects: true, invoices: true } },
            },
        });
    }

    async restoreClient(id: string) {
        const client = await prisma.client.findUnique({ where: { id } });
        if (!client) throw new NotFoundError('Client');
        if (!client.deleted_at) throw new ConflictError('Client is not deleted');

        return prisma.client.update({
            where: { id },
            data: { deleted_at: null },
        });
    }

    async permanentlyDeleteClient(id: string) {
        const client = await prisma.client.findUnique({
            where: { id },
            include: { projects: { select: { id: true } } },
        });
        if (!client) throw new NotFoundError('Client');

        // Cascade delete: tasks → project files → project checklists → projects → invoice items → invoices → client
        await prisma.$transaction(async (tx) => {
            const projectIds = client.projects.map(p => p.id);

            if (projectIds.length > 0) {
                await tx.task.deleteMany({ where: { project_id: { in: projectIds } } });
                await tx.projectFile.deleteMany({ where: { project_id: { in: projectIds } } });
                await tx.projectChecklist.deleteMany({ where: { project_id: { in: projectIds } } });
            }
            await tx.project.deleteMany({ where: { client_id: id } });

            // Delete invoice items first, then invoices
            const invoiceIds = (await tx.invoice.findMany({ where: { client_id: id }, select: { id: true } })).map(i => i.id);
            if (invoiceIds.length > 0) {
                await tx.invoiceItem.deleteMany({ where: { invoice_id: { in: invoiceIds } } });
                await tx.payment.deleteMany({ where: { invoice_id: { in: invoiceIds } } });
            }
            await tx.invoice.deleteMany({ where: { client_id: id } });

            await tx.client.delete({ where: { id } });
        });

        return { message: 'Client and all related data permanently deleted' };
    }
}

export const adminService = new AdminService();
