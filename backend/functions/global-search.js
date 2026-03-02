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
        const url = new URL(req.url);
        const q = url.searchParams.get('q') || '';
        if (!q || q.length < 2) {
            return new Response(JSON.stringify([]), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const searchTerm = `%${q}%`;

        const [leadsRes, clientsRes, projectsRes, tasksRes, invoicesRes] = await Promise.all([
            client.database.from('leads').select('id, name, email')
                .or(`name.ilike.${searchTerm},email.ilike.${searchTerm},company.ilike.${searchTerm}`)
                .limit(5),
            client.database.from('clients').select('id, name, email')
                .is('deleted_at', null)
                .or(`name.ilike.${searchTerm},email.ilike.${searchTerm},company.ilike.${searchTerm}`)
                .limit(5),
            client.database.from('projects').select('id, title, status')
                .ilike('title', searchTerm)
                .limit(5),
            client.database.from('tasks').select('id, title, status')
                .ilike('title', searchTerm)
                .limit(5),
            client.database.from('invoices').select('id, invoice_number, status')
                .ilike('invoice_number', searchTerm)
                .limit(5),
        ]);

        const results = [
            ...(leadsRes.data || []).map((r: any) => ({ id: r.id, title: r.name, subtitle: r.email, type: 'lead' })),
            ...(clientsRes.data || []).map((r: any) => ({ id: r.id, title: r.name, subtitle: r.email, type: 'client' })),
            ...(projectsRes.data || []).map((r: any) => ({ id: r.id, title: r.title, subtitle: r.status, type: 'project' })),
            ...(tasksRes.data || []).map((r: any) => ({ id: r.id, title: r.title, subtitle: r.status, type: 'task' })),
            ...(invoicesRes.data || []).map((r: any) => ({ id: r.id, title: r.invoice_number, subtitle: r.status, type: 'invoice' })),
        ];

        return new Response(JSON.stringify(results), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Internal server error';
        return new Response(JSON.stringify({ error: message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
