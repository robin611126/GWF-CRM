import { createClient } from 'npm:@insforge/sdk';

export default async function (req: Request): Promise<Response> {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    const authHeader = req.headers.get('Authorization');
    const userToken = authHeader ? authHeader.replace('Bearer ', '') : undefined;
    const client = createClient({
        baseUrl: Deno.env.get('INSFORGE_BASE_URL'),
        edgeFunctionToken: userToken
    });

    try {
        const { invoice_id, due_date, notes, tax_rate, items } = await req.json();

        const { data: invoice } = await client.database
            .from('invoices').select('*, payments(id)').eq('id', invoice_id).single();
        if (!invoice) {
            return new Response(JSON.stringify({ error: 'Invoice not found' }), {
                status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (invoice.status === 'PAID') {
            return new Response(JSON.stringify({ error: 'Cannot edit a fully paid invoice' }), {
                status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
        if (due_date) updateData.due_date = new Date(due_date).toISOString();
        if (notes !== undefined) updateData.notes = notes;
        if (tax_rate !== undefined) updateData.tax_rate = tax_rate;

        if (items) {
            const subtotal = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);
            const rate = tax_rate ?? Number(invoice.tax_rate || 0);
            const tax_amount = subtotal * rate / 100;
            const total_amount = subtotal + tax_amount;

            updateData.total_amount = total_amount;
            updateData.tax_amount = tax_amount;
            updateData.tax_rate = rate;

            const amountPaid = Number(invoice.amount_paid);
            if (amountPaid >= total_amount) updateData.status = 'PAID';
            else if (amountPaid > 0) updateData.status = 'PARTIAL';
            else updateData.status = 'UNPAID';

            await client.database.from('invoice_items').delete().eq('invoice_id', invoice_id);
            await client.database.from('invoice_items').insert(
                items.map((item: any) => ({
                    invoice_id, description: item.description,
                    quantity: item.quantity, unit_price: item.unit_price
                }))
            );
        }

        const { data: updated } = await client.database.from('invoices')
            .update(updateData).eq('id', invoice_id)
            .select('*, items:invoice_items(*), client:clients(id, name, company)').single();

        return new Response(JSON.stringify(updated), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Internal server error';
        return new Response(JSON.stringify({ error: message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
