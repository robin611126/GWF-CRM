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
        const { client_id } = await req.json();

        const { data: clientData, error } = await client.database
            .from('clients').select('*, invoices(id, status)').eq('id', client_id).single();

        if (error || !clientData || clientData.deleted_at) {
            return new Response(JSON.stringify({ error: 'Client not found' }), {
                status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const unpaid = (clientData.invoices || []).filter((i: any) => ['UNPAID', 'PARTIAL', 'OVERDUE'].includes(i.status));
        if (unpaid.length > 0) {
            return new Response(JSON.stringify({ error: 'Cannot delete client with unpaid invoices' }), {
                status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        await client.database.from('clients')
            .update({ deleted_at: new Date().toISOString(), lead_id: null, updated_at: new Date().toISOString() })
            .eq('id', client_id);

        if (clientData.lead_id) {
            await client.database.from('leads')
                .update({ stage: 'CONTACTED', updated_at: new Date().toISOString() })
                .eq('id', clientData.lead_id);
        }

        return new Response(JSON.stringify({ message: 'Client soft-deleted successfully' }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Internal server error';
        return new Response(JSON.stringify({ error: message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
