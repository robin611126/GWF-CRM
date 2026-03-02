import { Router, Response } from 'express';
import { invoiceService } from './invoice.service';
import { authenticate, AuthRequest } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import PDFDocument from 'pdfkit';
import prisma from '../../config/database';

const router = Router();

// Public taxes endpoint for invoice forms
router.get('/taxes', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const taxes = await prisma.taxConfig.findMany({ orderBy: { created_at: 'desc' } });
        res.json(taxes);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/', authenticate, authorize('invoices', 'read'), async (req: AuthRequest, res: Response) => {
    try {
        const result = await invoiceService.findAll({
            page: Number(req.query.page) || 1,
            limit: Number(req.query.limit) || 20,
            status: req.query.status as string,
            client_id: req.query.client_id as string,
        });
        res.json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.get('/:id', authenticate, authorize('invoices', 'read'), async (req: AuthRequest, res: Response) => {
    try {
        const invoice = await invoiceService.findById(req.params.id);
        res.json(invoice);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.get('/:id/pdf', authenticate, authorize('invoices', 'read'), async (req: AuthRequest, res: Response) => {
    try {
        const invoice = await invoiceService.findById(req.params.id);

        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${invoice.invoice_number}.pdf`);
        doc.pipe(res);

        // Header
        doc.fontSize(24).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica').text(invoice.invoice_number, { align: 'center' });
        doc.moveDown(1);

        // Client info
        doc.fontSize(10).font('Helvetica-Bold').text('Bill To:');
        doc.font('Helvetica').text(invoice.client?.name || '');
        doc.text(invoice.client?.company || '');
        doc.text(invoice.client?.email || '');
        if (invoice.client?.gst_number) doc.text(`GST: ${invoice.client.gst_number}`);
        doc.moveDown(1);

        // Dates
        doc.text(`Issued: ${new Date(invoice.issued_date).toLocaleDateString()}`);
        doc.text(`Due: ${new Date(invoice.due_date).toLocaleDateString()}`);
        doc.text(`Status: ${invoice.status}`);
        doc.moveDown(1);

        // Table header
        const tableTop = doc.y;
        doc.font('Helvetica-Bold');
        doc.text('Description', 50, tableTop, { width: 250 });
        doc.text('Qty', 310, tableTop, { width: 60, align: 'right' });
        doc.text('Price', 380, tableTop, { width: 80, align: 'right' });
        doc.text('Total', 470, tableTop, { width: 80, align: 'right' });
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);

        // Items
        doc.font('Helvetica');
        for (const item of invoice.items) {
            const y = doc.y;
            const lineTotal = Number(item.quantity) * Number(item.unit_price);
            doc.text(item.description, 50, y, { width: 250 });
            doc.text(String(item.quantity), 310, y, { width: 60, align: 'right' });
            doc.text(`Rs.${Number(item.unit_price).toFixed(2)}`, 380, y, { width: 80, align: 'right' });
            doc.text(`Rs.${lineTotal.toFixed(2)}`, 470, y, { width: 80, align: 'right' });
            doc.moveDown(0.5);
        }

        // Totals
        const subtotal = (invoice.items || []).reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.unit_price), 0);
        const taxRate = Number((invoice as any).tax_rate) || 0;
        const taxAmount = Number((invoice as any).tax_amount) || 0;

        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
        doc.font('Helvetica');
        doc.text(`Subtotal: Rs.${subtotal.toFixed(2)}`, 380, doc.y, { width: 170, align: 'right' });
        if (taxRate > 0) {
            doc.text(`Tax (${taxRate}%): Rs.${taxAmount.toFixed(2)}`, 380, doc.y, { width: 170, align: 'right' });
        }
        doc.font('Helvetica-Bold');
        doc.text(`Total: Rs.${Number(invoice.total_amount).toFixed(2)}`, 380, doc.y, { width: 170, align: 'right' });
        doc.text(`Paid: Rs.${Number(invoice.amount_paid).toFixed(2)}`, 380, doc.y, { width: 170, align: 'right' });
        const balance = Number(invoice.total_amount) - Number(invoice.amount_paid);
        doc.text(`Balance: Rs.${balance.toFixed(2)}`, 380, doc.y, { width: 170, align: 'right' });

        doc.end();
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.post('/', authenticate, authorize('invoices', 'write'), async (req: AuthRequest, res: Response) => {
    try {
        const invoice = await invoiceService.create(req.body);
        res.status(201).json(invoice);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.put('/:id', authenticate, authorize('invoices', 'write'), async (req: AuthRequest, res: Response) => {
    try {
        const invoice = await invoiceService.update(req.params.id, req.body);
        res.json(invoice);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.delete('/:id', authenticate, authorize('invoices', 'delete'), async (req: AuthRequest, res: Response) => {
    try {
        const result = await invoiceService.delete(req.params.id);
        res.json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

export default router;
