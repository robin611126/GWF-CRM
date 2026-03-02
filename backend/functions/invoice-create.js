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
        const { client_id, project_id, due_date, notes, tax_rate, items } = await req.json();

        const { data: clientData } = await client.database
            .from('clients').select('id').eq('id', client_id).is('deleted_at', null).single();
        if (!clientData) {
            return new Response(JSON.stringify({ error: 'Client not found' }), {
                status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (project_id) {
            const { data: proj } = await client.database
                .from('projects').select('id').eq('id', project_id).single();
            if (!proj) {
                return new Response(JSON.stringify({ error: 'Project not found' }), {
                    status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        // Get next invoice number — count existing
        const { count } = await client.database.from('invoices').select('id', { count: 'exact', head: true });
        const nextNum = (count || 0) + 1;
        const invoice_number = `INV-${String(nextNum).padStart(4, '0')}`;

        const subtotal = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);
        const taxRate = tax_rate || 0;
        const tax_amount = subtotal * taxRate / 100;
        const total_amount = subtotal + tax_amount;

        const { data: invoice } = await client.database.from('invoices')
            .insert({
                invoice_number, client_id,
                project_id: project_id || null,
                due_date: new Date(due_date).toISOString(),
                total_amount, tax_rate: taxRate, tax_amount, notes
            }).select('*, client:clients(id, name, company, email)').single();

        if (!invoice) {
            return new Response(JSON.stringify({ error: 'Failed to create invoice' }), {
                status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const itemsData = items.map((item: any) => ({
            invoice_id: invoice.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price
        }));
        const { data: createdItems } = await client.database.from('invoice_items')
            .insert(itemsData).select();

        await client.database.from('revision_history').insert({
            changed_by: 'SYSTEM', entity_type: 'Invoice',
            entity_id: invoice.id, field: 'Created Invoice',
            old_value: null, new_value: invoice_number
        });

        return new Response(JSON.stringify({ ...invoice, items: createdItems }), {
            status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Internal server error';
        return new Response(JSON.stringify({ error: message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
