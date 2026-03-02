import { createClient } from 'npm:@insforge/sdk';

export default async function (req: Request): Promise<Response> {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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
        const { payment_id } = await req.json();

        const { data: payment, error } = await client.database
            .from('payments').select('*, invoice:invoices(*)').eq('id', payment_id).single();

        if (error || !payment) {
            return new Response(JSON.stringify({ error: 'Payment not found' }), {
                status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const invoice = payment.invoice;
        const newPaid = Number(invoice.amount_paid) - Number(payment.amount);
        let newStatus = 'UNPAID';
        if (newPaid > 0 && newPaid < Number(invoice.total_amount)) newStatus = 'PARTIAL';
        else if (newPaid >= Number(invoice.total_amount)) newStatus = 'PAID';

        await client.database.from('payments').delete().eq('id', payment_id);

        await client.database.from('invoices')
            .update({ amount_paid: Math.max(0, newPaid), status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', invoice.id);

        return new Response(JSON.stringify({ message: 'Payment deleted and invoice updated' }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Internal server error';
        return new Response(JSON.stringify({ error: message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
