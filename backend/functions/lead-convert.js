import { createClient } from 'npm:@insforge/sdk';

export default async function (req) {
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

    const { data: userData } = await client.auth.getCurrentUser();
    if (!userData?.user?.id) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await req.json();
        const { action, leadId, updateData } = body;

        const { data: lead, error: leadError } = await client.database
            .from('leads').select('*').eq('id', leadId).single();

        if (leadError || !lead) {
            return new Response(JSON.stringify({ error: 'Lead not found' }), {
                status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'updateStage') {
            const { stage, lost_reason } = updateData;

            if (stage === 'LOST' && lead.stage !== 'LOST' && !lost_reason) {
                return new Response(JSON.stringify({ error: 'A reason is required when marking a lead as Lost' }), {
                    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            if (lead.stage === 'WON' && stage && stage !== 'WON') {
                const { data: linkedClient } = await client.database
                    .from('clients').select('id').eq('lead_id', leadId).maybeSingle();
                if (linkedClient) {
                    await client.database.from('clients')
                        .update({ frozen: true, updated_at: new Date().toISOString() })
                        .eq('id', linkedClient.id);
                }
            }

            if (stage === 'WON' && lead.stage !== 'WON') {
                const { data: existingClient } = await client.database
                    .from('clients').select('id').eq('lead_id', leadId).maybeSingle();

                if (existingClient) {
                    await client.database.from('clients')
                        .update({ frozen: false, updated_at: new Date().toISOString() })
                        .eq('id', existingClient.id);
                    const { data: updated } = await client.database.from('leads')
                        .update({ ...updateData, stage, updated_at: new Date().toISOString() })
                        .eq('id', leadId).select('*, assigned_user:user_roles!leads_assigned_user_id_fkey(id, first_name, last_name)').single();
                    return new Response(JSON.stringify(updated), {
                        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                } else {
                    return await convertLeadToClient(client, leadId, lead, updateData, corsHeaders);
                }
            }

            const upd = { ...updateData, updated_at: new Date().toISOString() };
            if (stage) upd.stage = stage;
            const { data: updated } = await client.database.from('leads')
                .update(upd).eq('id', leadId)
                .select('*, assigned_user:user_roles!leads_assigned_user_id_fkey(id, first_name, last_name)').single();
            return new Response(JSON.stringify(updated), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'convert') {
            const { data: existingClient } = await client.database
                .from('clients').select('id').eq('lead_id', leadId).maybeSingle();
            if (existingClient) {
                return new Response(JSON.stringify({ error: 'This lead has already been converted to a client' }), {
                    status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            if (lead.email) {
                const { data: emailClient } = await client.database
                    .from('clients').select('id').eq('email', lead.email).is('deleted_at', null).maybeSingle();
                if (emailClient) {
                    return new Response(JSON.stringify({ error: 'A client with this email already exists' }), {
                        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }
            }
            return await convertLeadToClient(client, leadId, lead, {}, corsHeaders);
        }

        return new Response(JSON.stringify({ error: 'Invalid action' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Internal server error';
        return new Response(JSON.stringify({ error: message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

async function convertLeadToClient(client: any, leadId: string, lead: any, updateData: any, corsHeaders: Record<string, string>) {
    await client.database.from('leads')
        .update({ ...updateData, stage: 'WON', updated_at: new Date().toISOString() })
        .eq('id', leadId);

    let clientRecord: any = null;
    if (lead.email) {
        const { data: softDeleted } = await client.database
            .from('clients').select('*')
            .eq('email', lead.email).not('deleted_at', 'is', null).maybeSingle();
        if (softDeleted) {
            const { data: restored } = await client.database.from('clients')
                .update({
                    deleted_at: null, lead_id: leadId, name: lead.name,
                    company: lead.company, phone: lead.phone, frozen: false,
                    updated_at: new Date().toISOString()
                })
                .eq('id', softDeleted.id).select().single();
            clientRecord = restored;
        }
    }

    if (!clientRecord) {
        const { data: newClient } = await client.database.from('clients')
            .insert({
                name: lead.name, email: lead.email, company: lead.company,
                phone: lead.phone, lead_id: leadId
            }).select().single();
        clientRecord = newClient;
    }

    if (!clientRecord) {
        return new Response(JSON.stringify({ error: 'Failed to create client' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const { data: project } = await client.database.from('projects')
        .insert({
            client_id: clientRecord.id,
            title: `${lead.company || lead.name} - Initial Project`,
            description: 'Auto-created project from lead conversion',
            status: 'PLANNING'
        }).select().single();

    const milestones = [
        { label: 'Requirements Gathering', sort_order: 1 },
        { label: 'Design Phase', sort_order: 2 },
        { label: 'Development', sort_order: 3 },
        { label: 'Testing & QA', sort_order: 4 },
        { label: 'Deployment & Handover', sort_order: 5 }
    ].map(m => ({ ...m, project_id: project.id, is_completed: false }));

    await client.database.from('project_checklists').insert(milestones);

    if (lead.assigned_user_id) {
        await client.database.from('revision_history').insert({
            changed_by: lead.assigned_user_id, entity_type: 'Lead',
            entity_id: leadId, field: 'Converted to Client',
            old_value: null, new_value: clientRecord.name
        });
    }

    const updatedLead = await client.database.from('leads')
        .select('*').eq('id', leadId).single();

    return new Response(JSON.stringify({
        lead: updatedLead.data, client: clientRecord, project
    }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}
