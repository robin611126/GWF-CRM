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
            .from('clients').select('*, projects(id)').eq('id', client_id).single();

        if (error || !clientData) {
            return new Response(JSON.stringify({ error: 'Client not found' }), {
                status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const projectIds = (clientData.projects || []).map((p: any) => p.id);

        if (projectIds.length > 0) {
            for (const pid of projectIds) {
                await client.database.from('tasks').delete().eq('project_id', pid);
                await client.database.from('project_files').delete().eq('project_id', pid);
                await client.database.from('project_checklists').delete().eq('project_id', pid);
            }
        }

        await client.database.from('projects').delete().eq('client_id', client_id);

        const { data: invoices } = await client.database
            .from('invoices').select('id').eq('client_id', client_id);

        if (invoices && invoices.length > 0) {
            for (const inv of invoices) {
                await client.database.from('invoice_items').delete().eq('invoice_id', inv.id);
                await client.database.from('payments').delete().eq('invoice_id', inv.id);
            }
        }
        await client.database.from('invoices').delete().eq('client_id', client_id);

        await client.database.from('clients').delete().eq('id', client_id);

        return new Response(JSON.stringify({ message: 'Client and all related data permanently deleted' }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Internal server error';
        return new Response(JSON.stringify({ error: message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
