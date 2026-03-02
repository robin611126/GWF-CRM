import prisma from '../../config/database';
import { NotFoundError, ValidationError, UnprocessableError } from '../../utils/errors';
import { logActivity } from '../../utils/activityLogger';

export class InvoiceService {
    async create(data: { client_id: string; project_id?: string; due_date: string; notes?: string; tax_rate?: number; items: Array<{ description: string; quantity: number; unit_price: number }> }) {
        const client = await prisma.client.findUnique({ where: { id: data.client_id } });
        if (!client || client.deleted_at) throw new NotFoundError('Client');

        if (data.project_id) {
            const project = await prisma.project.findUnique({ where: { id: data.project_id } });
            if (!project) throw new NotFoundError('Project');
        }

        // Generate invoice number
        const lastInvoice = await prisma.invoice.findFirst({ orderBy: { created_at: 'desc' } });
        let nextNum = 1;
        if (lastInvoice) {
            const match = lastInvoice.invoice_number.match(/INV-(\d+)/);
            if (match) nextNum = parseInt(match[1]) + 1;
        }
        const invoice_number = `INV-${String(nextNum).padStart(4, '0')}`;

        // Calculate subtotal and tax
        const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const tax_rate = data.tax_rate || 0;
        const tax_amount = subtotal * tax_rate / 100;
        const total_amount = subtotal + tax_amount;

        const invoice = await prisma.invoice.create({
            data: {
                invoice_number,
                client_id: data.client_id,
                project_id: data.project_id || null,
                due_date: new Date(data.due_date),
                total_amount,
                tax_rate,
                tax_amount,
                notes: data.notes,
                items: {
                    create: data.items.map(item => ({
                        description: item.description,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                    })),
                },
            },
            include: { items: true, client: { select: { id: true, name: true, company: true, email: true } } },
        });

        // Log Invoice creation
        await logActivity(
            'SYSTEM', // Defaulting to system if no user ID passed
            'Invoice',
            invoice.id,
            'Created Invoice',
            null,
            invoice.invoice_number
        );

        return invoice;
    }

    async findAll(filters: { page?: number; limit?: number; status?: string; client_id?: string }) {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;
        const where: any = {
            client: { deleted_at: null },
        };

        if (filters.status) where.status = filters.status;
        if (filters.client_id) where.client_id = filters.client_id;

        const [invoices, total] = await Promise.all([
            prisma.invoice.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    client: { select: { id: true, name: true, company: true } },
                    items: true,
                    _count: { select: { payments: true } },
                },
            }),
            prisma.invoice.count({ where }),
        ]);

        // Check for overdue invoices
        const now = new Date();
        const processedInvoices = invoices.map(inv => {
            if (inv.due_date < now && inv.status !== 'PAID') {
                return { ...inv, status: 'OVERDUE' as const };
            }
            return inv;
        });

        return { invoices: processedInvoices, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async findById(id: string) {
        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: {
                client: { select: { id: true, name: true, company: true, email: true, gst_number: true } },
                project: { select: { id: true, title: true } },
                items: true,
                payments: { orderBy: { date: 'desc' } },
            },
        });
        if (!invoice) throw new NotFoundError('Invoice');
        return invoice;
    }

    async update(id: string, data: { due_date?: string; notes?: string; tax_rate?: number; items?: Array<{ description: string; quantity: number; unit_price: number }> }) {
        const invoice = await prisma.invoice.findUnique({ where: { id }, include: { payments: true } });
        if (!invoice) throw new NotFoundError('Invoice');

        if (invoice.status === 'PAID') {
            throw new UnprocessableError('Cannot edit a fully paid invoice');
        }

        const updateData: any = {};
        if (data.due_date) updateData.due_date = new Date(data.due_date);
        if (data.notes !== undefined) updateData.notes = data.notes;

        if (data.tax_rate !== undefined) {
            updateData.tax_rate = data.tax_rate;
        }

        if (data.items) {
            const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
            const tax_rate = data.tax_rate ?? (Number((invoice as any).tax_rate) || 0);
            const tax_amount = subtotal * tax_rate / 100;
            const total_amount = subtotal + tax_amount;
            updateData.total_amount = total_amount;
            updateData.tax_amount = tax_amount;
            updateData.tax_rate = tax_rate;

            // Recalculate status
            const amountPaid = Number(invoice.amount_paid);
            if (amountPaid >= total_amount) {
                updateData.status = 'PAID';
            } else if (amountPaid > 0) {
                updateData.status = 'PARTIAL';
            } else {
                updateData.status = 'UNPAID';
            }

            // Delete old items and create new ones
            await prisma.invoiceItem.deleteMany({ where: { invoice_id: id } });
            await prisma.invoiceItem.createMany({
                data: data.items.map(item => ({
                    invoice_id: id,
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                })),
            });
        }

        const updated = await prisma.invoice.update({
            where: { id },
            data: updateData,
            include: { items: true, client: { select: { id: true, name: true, company: true } } },
        });

        return updated;
    }

    async delete(id: string) {
        const invoice = await prisma.invoice.findUnique({ where: { id }, include: { payments: true } });
        if (!invoice) throw new NotFoundError('Invoice');

        if (invoice.payments.length > 0) {
            throw new UnprocessableError('Cannot delete an invoice with recorded payments');
        }

        await prisma.invoice.delete({ where: { id } });
        return { message: 'Invoice deleted successfully' };
    }
}

export const invoiceService = new InvoiceService();
