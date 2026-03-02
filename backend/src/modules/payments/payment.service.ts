import prisma from '../../config/database';
import { NotFoundError, UnprocessableError } from '../../utils/errors';

export class PaymentService {
    async create(data: { invoice_id: string; amount: number; method?: string; notes?: string; date?: string }) {
        const invoice = await prisma.invoice.findUnique({ where: { id: data.invoice_id } });
        if (!invoice) throw new NotFoundError('Invoice');

        const balance = Number(invoice.total_amount) - Number(invoice.amount_paid);
        if (data.amount > balance) {
            throw new UnprocessableError(`Payment amount ($${data.amount}) exceeds remaining balance ($${balance.toFixed(2)})`);
        }

        if (data.amount <= 0) {
            throw new UnprocessableError('Payment amount must be positive');
        }

        const newPaid = Number(invoice.amount_paid) + data.amount;
        let newStatus: 'UNPAID' | 'PARTIAL' | 'PAID' = 'PARTIAL';
        if (newPaid >= Number(invoice.total_amount)) {
            newStatus = 'PAID';
        }

        const [payment] = await prisma.$transaction([
            prisma.payment.create({
                data: {
                    invoice_id: data.invoice_id,
                    amount: data.amount,
                    method: (data.method as any) || 'BANK',
                    notes: data.notes,
                    date: data.date ? new Date(data.date) : new Date(),
                },
            }),
            prisma.invoice.update({
                where: { id: data.invoice_id },
                data: { amount_paid: newPaid, status: newStatus },
            }),
        ]);

        return payment;
    }

    async findByInvoice(invoiceId: string) {
        const payments = await prisma.payment.findMany({
            where: { invoice_id: invoiceId },
            orderBy: { date: 'desc' },
        });
        return payments;
    }

    async findAll(filters: { page?: number; limit?: number }) {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = {
            invoice: { client: { deleted_at: null } },
        };

        const [payments, total] = await Promise.all([
            prisma.payment.findMany({
                where,
                skip,
                take: limit,
                orderBy: { date: 'desc' },
                include: {
                    invoice: {
                        select: { id: true, invoice_number: true, client: { select: { id: true, name: true } } },
                    },
                },
            }),
            prisma.payment.count({ where }),
        ]);

        return { payments, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async delete(id: string) {
        const payment = await prisma.payment.findUnique({ where: { id }, include: { invoice: true } });
        if (!payment) throw new NotFoundError('Payment');

        const newPaid = Number(payment.invoice.amount_paid) - Number(payment.amount);
        let newStatus: 'UNPAID' | 'PARTIAL' | 'PAID' = 'UNPAID';
        if (newPaid > 0 && newPaid < Number(payment.invoice.total_amount)) {
            newStatus = 'PARTIAL';
        } else if (newPaid >= Number(payment.invoice.total_amount)) {
            newStatus = 'PAID';
        }

        await prisma.$transaction([
            prisma.payment.delete({ where: { id } }),
            prisma.invoice.update({
                where: { id: payment.invoice_id },
                data: { amount_paid: Math.max(0, newPaid), status: newStatus },
            }),
        ]);

        return { message: 'Payment deleted and invoice updated' };
    }
}

export const paymentService = new PaymentService();
