import { createClient } from 'npm:@insforge/sdk';

export default async function (req: Request): Promise<Response> {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
        const { invoice_id, amount, method, notes, date } = await req.json();

        const { data: invoice, error } = await client.database
            .from('invoices').select('*').eq('id', invoice_id).single();
        if (error || !invoice) {
            return new Response(JSON.stringify({ error: 'Invoice not found' }), {
                status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const balance = Number(invoice.total_amount) - Number(invoice.amount_paid);
        if (amount > balance) {
            return new Response(JSON.stringify({ error: `Payment amount exceeds remaining balance ($${balance.toFixed(2)})` }), {
                status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        if (amount <= 0) {
            return new Response(JSON.stringify({ error: 'Payment amount must be positive' }), {
                status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const newPaid = Number(invoice.amount_paid) + amount;
        let newStatus = 'PARTIAL';
        if (newPaid >= Number(invoice.total_amount)) newStatus = 'PAID';

        const { data: payment } = await client.database.from('payments')
            .insert({
                invoice_id, amount, method: method || 'BANK',
                notes, date: date ? new Date(date).toISOString() : new Date().toISOString()
            }).select().single();

        await client.database.from('invoices')
            .update({ amount_paid: newPaid, status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', invoice_id);

        return new Response(JSON.stringify(payment), {
            status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Internal server error';
        return new Response(JSON.stringify({ error: message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
