import { jsPDF } from 'jspdf';

// Colors
const BLUE = [52, 152, 219];
const DARK_BLUE = [41, 128, 185];
const DARK = [33, 37, 41];
const MEDIUM = [73, 80, 87];
const GRAY = [134, 142, 150];
const LIGHT_BG = [245, 247, 250];
const WHITE = [255, 255, 255];
const GREEN = [39, 174, 96];
const AMBER = [243, 156, 18];
const RED = [231, 76, 60];

function fmt(num) {
    return Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Generate a professionally styled invoice PDF matching the reference design
 */
export default function generateInvoicePDF(invoice) {
    const doc = new jsPDF('p', 'mm', 'a4');
    const inv = invoice;
    const W = 210; // A4 width
    const H = 297; // A4 height
    const L = 18;  // left margin
    const R = W - 18; // right edge
    const CW = R - L; // content width

    const items = inv.items || [];
    const totalAmount = Number(inv.total_amount || 0);
    const amountPaid = Number(inv.amount_paid || 0);
    const balance = totalAmount - amountPaid;
    const subtotal = items.reduce((s, item) => s + Number(item.quantity) * Number(item.unit_price), 0);
    const taxAmount = Number(inv.tax_amount || 0);
    const taxRate = Number(inv.tax_rate || 0);

    let y = 0;

    // ===== TOP ACCENT BAR =====
    doc.setFillColor(...DARK_BLUE);
    doc.rect(0, 0, W, 5, 'F');

    // ===== HEADER SECTION =====
    y = 20;

    // Company name (left)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(...DARK_BLUE);
    doc.text('GWF', L, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text('Web & Digital Agency', L, y + 6);

    // INVOICE title (right-aligned)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(32);
    doc.setTextColor(...DARK_BLUE);
    doc.text('INVOICE', R, y, { align: 'right' });

    y = 40;

    // Thin separator
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(L, y, R, y);

    y = 48;

    // ===== INVOICE META: Invoice No | Date | Invoice To =====
    const col1 = L;
    const col2 = L + 50;
    const col3 = L + 110;

    // Labels
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text('Invoice No.', col1, y);
    doc.text('Date', col2, y);
    doc.text('Invoice To:', col3, y);

    // Values
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text(inv.invoice_number || '—', col1, y + 6);
    doc.text(fmtDate(inv.issued_date || inv.created_at), col2, y + 6);
    doc.text(inv.client?.name || '—', col3, y + 6);

    // Client company
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MEDIUM);
    if (inv.client?.company) doc.text(inv.client.company, col3, y + 12);

    y = 70;

    // ===== TOTAL DUE BOX =====
    doc.setFillColor(...LIGHT_BG);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.roundedRect(L, y, CW, 26, 2, 2, 'FD');

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text('TOTAL DUE', L + 8, y + 8);

    // Amount - show balance due (remaining) for partial, full amount otherwise
    const displayDue = amountPaid > 0 && balance > 0 ? balance : totalAmount;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...DARK);
    doc.text('Rs. ' + fmt(displayDue), L + 8, y + 20);

    // Client contact (right side of box)
    let cY = y + 9;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    if (inv.client?.email) {
        doc.text(inv.client.email, R - 8, cY, { align: 'right' });
        cY += 5;
    }
    if (inv.client?.phone) {
        doc.text(inv.client.phone, R - 8, cY, { align: 'right' });
        cY += 5;
    }
    if (inv.client?.gst_number) {
        doc.text('GST: ' + inv.client.gst_number, R - 8, cY, { align: 'right' });
    }

    y = 102;

    // ===== DUE DATE + STATUS =====
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text('Due Date: ' + fmtDate(inv.due_date), L, y);

    // Status badge
    const statusMap = {
        PAID: { label: 'PAID', color: GREEN },
        PARTIAL: { label: 'PARTIAL', color: AMBER },
        UNPAID: { label: 'UNPAID', color: GRAY },
        OVERDUE: { label: 'OVERDUE', color: RED },
        CANCELLED: { label: 'CANCELLED', color: GRAY },
    };
    const st = statusMap[inv.status] || statusMap.UNPAID;
    doc.setFillColor(...st.color);
    const badgeW = doc.getStringUnitWidth(st.label) * 8 / doc.internal.scaleFactor + 10;
    doc.roundedRect(R - badgeW, y - 4, badgeW, 7, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...WHITE);
    doc.text(st.label, R - badgeW / 2, y + 1, { align: 'center' });

    y = 112;

    // ===== ITEMS TABLE =====
    // Column positions
    const descX = L + 3;
    const priceX = L + CW * 0.55;
    const qtyX = L + CW * 0.72;
    const totalX = R - 3;
    const headerH = 9;

    // Table header
    doc.setFillColor(...DARK_BLUE);
    doc.rect(L, y, CW, headerH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...WHITE);
    doc.text('Item Description', descX, y + 6);
    doc.text('Unit Price', priceX, y + 6, { align: 'right' });
    doc.text('Qty', qtyX, y + 6, { align: 'center' });
    doc.text('Total', totalX, y + 6, { align: 'right' });

    y += headerH;

    // Table rows
    items.forEach((item, i) => {
        const rowH = 11;

        // Alternating row background
        if (i % 2 === 0) {
            doc.setFillColor(252, 252, 254);
            doc.rect(L, y, CW, rowH, 'F');
        }

        // Description
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...DARK);
        doc.text(String(item.description || ''), descX, y + 6);

        // Unit price
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...MEDIUM);
        doc.text('Rs. ' + fmt(item.unit_price), priceX, y + 6, { align: 'right' });

        // Qty
        doc.setTextColor(...DARK);
        doc.text(String(item.quantity || 0), qtyX, y + 6, { align: 'center' });

        // Row total
        const rowTotal = Number(item.quantity) * Number(item.unit_price);
        doc.setFont('helvetica', 'bold');
        doc.text('Rs. ' + fmt(rowTotal), totalX, y + 6, { align: 'right' });

        // Row bottom border
        doc.setDrawColor(235, 235, 235);
        doc.setLineWidth(0.2);
        doc.line(L, y + rowH, R, y + rowH);

        y += rowH;
    });

    // Table bottom border
    doc.setDrawColor(...DARK_BLUE);
    doc.setLineWidth(0.5);
    doc.line(L, y, R, y);

    y += 8;

    // ===== PAYMENT HISTORY (left) + TOTALS (right) =====
    const totalsLabelX = L + CW * 0.55;
    const totalsValueX = R - 3;
    let totalsY = y;

    // Payment History (left column)
    const payments = inv.payments || [];
    if (payments.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...DARK);
        doc.text('Payment History', L, y);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        let pY = y + 6;
        payments.forEach(p => {
            doc.setTextColor(...GREEN);
            const line = fmtDate(p.date) + '  |  ' + (p.method || 'N/A') + '  |  Rs. ' + fmt(p.amount);
            doc.text(line, L, pY);
            pY += 5;
        });
    }

    // Totals (right column)
    // Sub Total
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text('Sub Total:', totalsLabelX, totalsY, { align: 'right' });
    doc.setTextColor(...DARK);
    doc.text('Rs. ' + fmt(subtotal), totalsValueX, totalsY, { align: 'right' });
    totalsY += 6;

    // Tax
    if (taxRate > 0) {
        doc.setTextColor(...GRAY);
        doc.text('Tax (' + taxRate + '%):', totalsLabelX, totalsY, { align: 'right' });
        doc.setTextColor(...DARK);
        doc.text('Rs. ' + fmt(taxAmount), totalsValueX, totalsY, { align: 'right' });
        totalsY += 6;
    }

    // Amount Paid (if any)
    if (amountPaid > 0) {
        doc.setTextColor(...GRAY);
        doc.text('Amount Paid:', totalsLabelX, totalsY, { align: 'right' });
        doc.setTextColor(...GREEN);
        doc.text('- Rs. ' + fmt(amountPaid), totalsValueX, totalsY, { align: 'right' });
        totalsY += 6;
    }

    totalsY += 3;

    // Grand Total box
    const gtBoxW = R - totalsLabelX + 18;
    const gtBoxX = totalsLabelX - 15;
    doc.setFillColor(...DARK_BLUE);
    doc.roundedRect(gtBoxX, totalsY - 5, gtBoxW, 11, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...WHITE);
    doc.text('Grand Total', gtBoxX + 6, totalsY + 2);

    // Show balance due if partial, otherwise full total
    const grandTotalDisplay = balance > 0 && amountPaid > 0 ? balance : totalAmount;
    doc.text('Rs. ' + fmt(grandTotalDisplay), totalsValueX, totalsY + 2, { align: 'right' });

    y = Math.max(y + (payments.length * 5) + 10, totalsY + 18);

    // ===== NOTES =====
    if (inv.notes) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...DARK);
        doc.text('Notes', L, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...MEDIUM);
        const noteLines = doc.splitTextToSize(inv.notes, CW);
        doc.text(noteLines, L, y + 5);
        y += 5 + noteLines.length * 4 + 6;
    }

    // ===== SIGNATURE =====
    y += 8;
    doc.setDrawColor(...GRAY);
    doc.setLineWidth(0.3);
    doc.line(R - 55, y, R, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text('Authorized Signature', R - 27.5, y + 5, { align: 'center' });

    // ===== FOOTER =====
    // Footer background
    doc.setFillColor(...LIGHT_BG);
    doc.rect(0, H - 18, W, 14, 'F');

    // Bottom accent bar
    doc.setFillColor(...DARK_BLUE);
    doc.rect(0, H - 4, W, 4, 'F');

    // Footer text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text('Thank you for your business!', L, H - 9);

    // Footer branding
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...DARK_BLUE);
    doc.text('GWF', R, H - 9, { align: 'right' });

    return doc;
}
