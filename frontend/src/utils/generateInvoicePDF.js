import { jsPDF } from 'jspdf';

// Brand colors
const BLUE = [41, 128, 185];       // #2980b9 - primary accent
const DARK = [44, 62, 80];         // #2c3e50 - headings
const GRAY = [127, 140, 141];      // #7f8c8d - secondary text
const LIGHT_GRAY = [236, 240, 241]; // #ecf0f1 - backgrounds
const WHITE = [255, 255, 255];
const RED = [231, 76, 60];         // #e74c3c - danger/overdue

/**
 * Generate a professionally styled invoice PDF
 * @param {Object} invoice - Full invoice object with client, items, payments
 * @returns {jsPDF} - The generated PDF document
 */
export default function generateInvoicePDF(invoice) {
    const doc = new jsPDF();
    const inv = invoice;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentW = pageW - margin * 2;
    let y = 0;

    // ========== TOP BLUE ACCENT BAR ==========
    doc.setFillColor(...BLUE);
    doc.rect(0, 0, pageW, 4, 'F');

    y = 18;

    // ========== HEADER: Company + INVOICE Title ==========
    // Company name (left)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...BLUE);
    doc.text('GWF', margin, y);
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    doc.text('Web & Digital Agency', margin, y + 6);

    // "INVOICE" title (right)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(...BLUE);
    doc.text('INVOICE', pageW - margin, y, { align: 'right' });

    y += 18;

    // ========== DIVIDER LINE ==========
    doc.setDrawColor(...LIGHT_GRAY);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);

    y += 10;

    // ========== INVOICE META ROW ==========
    // Left columns: Invoice No. and Date
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text('Invoice no.', margin, y);
    doc.text('Date', margin + 45, y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text(inv.invoice_number || '—', margin, y + 5);
    doc.text(
        new Date(inv.issued_date || inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        margin + 45, y + 5
    );

    // Right column: Invoice To
    const invoiceToX = pageW - margin - 65;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text('Invoice to:', invoiceToX, y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text(inv.client?.name || '—', invoiceToX, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    if (inv.client?.company) doc.text(inv.client.company, invoiceToX, y + 10);

    y += 22;

    // ========== TOTAL DUE SECTION ==========
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(margin, y, contentW, 22, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text('TOTAL DUE', margin + 8, y + 9);

    doc.setFontSize(18);
    doc.setTextColor(...DARK);
    doc.text(`₹${Number(inv.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, margin + 8, y + 18);

    // Client contact info (right side of total due box)
    const contactX = pageW - margin - 5;
    let contactY = y + 7;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    if (inv.client?.email) {
        doc.text(`✉  ${inv.client.email}`, contactX, contactY, { align: 'right' });
        contactY += 5;
    }
    if (inv.client?.phone) {
        doc.text(`☎  ${inv.client.phone}`, contactX, contactY, { align: 'right' });
        contactY += 5;
    }
    if (inv.client?.gst_number) {
        doc.text(`GST: ${inv.client.gst_number}`, contactX, contactY, { align: 'right' });
    }

    y += 30;

    // Due date info
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(`Due Date: ${new Date(inv.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, margin, y);

    // Status badge
    const status = inv.status;
    const statusColors = {
        PAID: [39, 174, 96],
        PARTIAL: [243, 156, 18],
        UNPAID: [149, 165, 166],
        OVERDUE: [231, 76, 60],
        CANCELLED: [149, 165, 166],
    };
    const statusLabels = { PAID: 'PAID', PARTIAL: 'PARTIAL', UNPAID: 'UNPAID', OVERDUE: 'OVERDUE', CANCELLED: 'CANCELLED' };
    const sColor = statusColors[status] || GRAY;
    const sLabel = statusLabels[status] || status;
    const sTextW = doc.getTextWidth(sLabel);
    const sBadgeX = pageW - margin - sTextW - 10;
    doc.setFillColor(...sColor);
    doc.roundedRect(sBadgeX, y - 4, sTextW + 10, 7, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...WHITE);
    doc.text(sLabel, sBadgeX + 5, y + 1);

    y += 10;

    // ========== LINE ITEMS TABLE ==========
    // Table header
    const colDesc = margin;
    const colPrice = 115;
    const colQty = 145;
    const colTotal = pageW - margin;
    const rowH = 10;

    doc.setFillColor(...BLUE);
    doc.rect(margin, y, contentW, rowH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...WHITE);
    doc.text('Item Description', colDesc + 4, y + 7);
    doc.text('Unit Price', colPrice, y + 7, { align: 'right' });
    doc.text('Qty', colQty, y + 7, { align: 'right' });
    doc.text('Total', colTotal - 4, y + 7, { align: 'right' });

    y += rowH;

    // Table rows
    const items = inv.items || [];
    items.forEach((item, i) => {
        const isEven = i % 2 === 0;
        const itemRowH = 12;

        if (isEven) {
            doc.setFillColor(250, 250, 252);
            doc.rect(margin, y, contentW, itemRowH, 'F');
        }

        // Item description
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...DARK);
        doc.text(String(item.description || ''), colDesc + 4, y + 5);

        // Sub-description (service line)
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...GRAY);
        const subDesc = item.notes || '';
        if (subDesc) doc.text(subDesc, colDesc + 4, y + 9);

        // Values
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...DARK);
        doc.text(`₹${Number(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, colPrice, y + 5, { align: 'right' });
        doc.text(String(item.quantity), colQty, y + 5, { align: 'right' });
        doc.text(`₹${(Number(item.quantity) * Number(item.unit_price)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, colTotal - 4, y + 5, { align: 'right' });

        // Row divider
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.3);
        doc.line(margin, y + itemRowH, pageW - margin, y + itemRowH);

        y += itemRowH;
    });

    y += 6;

    // ========== PAYMENT METHOD & TOTALS ROW ==========
    const totalsX = 125;

    // Payment info (left side)
    if (inv.payments && inv.payments.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...DARK);
        doc.text('Payment History', margin, y);

        let payY = y + 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        inv.payments.forEach(p => {
            doc.setTextColor(...GRAY);
            const date = new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            const method = p.method || '';
            doc.text(`${date}  •  ${method}  •  ₹${Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, margin, payY);
            payY += 5;
        });
    }

    // Totals (right side)
    const subtotal = items.reduce((s, item) => s + Number(item.quantity) * Number(item.unit_price), 0);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text('Sub Total:', totalsX, y);
    doc.setTextColor(...DARK);
    doc.text(`₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, colTotal - 4, y, { align: 'right' });

    y += 6;

    if (Number(inv.tax_rate) > 0) {
        doc.setTextColor(...GRAY);
        doc.text(`Tax (${inv.tax_rate}%):`, totalsX, y);
        doc.setTextColor(...DARK);
        doc.text(`₹${Number(inv.tax_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, colTotal - 4, y, { align: 'right' });
        y += 6;
    }

    // Amount Paid
    if (Number(inv.amount_paid) > 0) {
        doc.setTextColor(...GRAY);
        doc.text('Amount Paid:', totalsX, y);
        doc.setTextColor(39, 174, 96);
        doc.text(`- ₹${Number(inv.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, colTotal - 4, y, { align: 'right' });
        y += 6;
    }

    // Grand Total box
    y += 2;
    const grandTotalW = colTotal - totalsX + 4;
    doc.setFillColor(...BLUE);
    doc.roundedRect(totalsX - 4, y - 4, grandTotalW, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...WHITE);
    doc.text('Grand Total', totalsX, y + 3);

    const balance = Number(inv.total_amount) - Number(inv.amount_paid);
    const displayTotal = balance > 0 ? balance : Number(inv.total_amount);
    doc.text(`₹${displayTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, colTotal - 4, y + 3, { align: 'right' });

    y += 18;

    // ========== NOTES SECTION ==========
    if (inv.notes) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...DARK);
        doc.text('Notes:', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...GRAY);
        const noteLines = doc.splitTextToSize(inv.notes, contentW);
        doc.text(noteLines, margin, y + 5);
        y += 5 + noteLines.length * 4;
    }

    // ========== SIGNATURE SECTION ==========
    y += 10;
    doc.setDrawColor(...GRAY);
    doc.setLineWidth(0.3);
    doc.line(pageW - margin - 60, y, pageW - margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text('Authorized Signature', pageW - margin - 30, y + 5, { align: 'center' });

    // ========== FOOTER BAR ==========
    const footerY = pageH - 14;

    // Bottom accent bar
    doc.setFillColor(...BLUE);
    doc.rect(0, pageH - 4, pageW, 4, 'F');

    // Footer content
    doc.setFillColor(248, 249, 250);
    doc.rect(0, footerY - 4, pageW, 14, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text('Thank you for your business!', margin, footerY + 2);

    // Company info (right)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...BLUE);
    doc.text('GWF', pageW - margin, footerY + 2, { align: 'right' });

    return doc;
}
