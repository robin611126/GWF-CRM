/**
 * GWF CRM API Layer — InsForge Backend
 * 
 * Smart proxy: Intercepts all legacy `api.get/post/put/delete/patch('/path', body)` 
 * calls and routes them to InsForge SDK operations. No frontend component changes needed.
 */
import { insforge } from './insforge';

// ==================== HELPERS ====================
function extractId(url, prefix) {
    // Matches /prefix/:id or /prefix/:id/action
    const regex = new RegExp(`^/${prefix}/([^/]+)`);
    const match = url.match(regex);
    return match ? match[1] : null;
}

function parseQueryParams(url) {
    const params = {};
    const qIndex = url.indexOf('?');
    if (qIndex > -1) {
        const query = url.substring(qIndex + 1);
        query.split('&').forEach(pair => {
            const [key, value] = pair.split('=');
            if (key && value !== undefined) params[decodeURIComponent(key)] = decodeURIComponent(value);
        });
    }
    return params;
}

function urlPath(url) {
    const qIndex = url.indexOf('?');
    return qIndex > -1 ? url.substring(0, qIndex) : url;
}

// ==================== ROUTE HANDLERS ====================
const routes = {
    // --- AUTH ---
    'GET /auth/me': async () => {
        const { data: session } = await insforge.auth.getCurrentSession();
        if (!session?.session?.user) throw new Error('Not authenticated');
        const user = session.session.user;
        const { data: roleData } = await insforge.database
            .from('user_roles').select('*').eq('email', user.email).single();
        return {
            id: roleData?.id || user.id,
            email: user.email,
            first_name: roleData?.first_name || user.profile?.name?.split(' ')[0] || '',
            last_name: roleData?.last_name || user.profile?.name?.split(' ').slice(1).join(' ') || '',
            role: roleData?.role || 'DEVELOPER',
            is_active: roleData?.is_active ?? true,
        };
    },

    'POST /auth/login': async (body) => {
        const { data, error } = await insforge.auth.signInWithPassword({ email: body.email, password: body.password });
        if (error) {
            console.error('InsForge auth error:', error);
            throw error;
        }
        console.log('InsForge auth response:', JSON.stringify(data, null, 2));
        const { data: roleData } = await insforge.database
            .from('user_roles').select('*').eq('email', body.email).single();
        // InsForge SDK may return token at different locations
        const accessToken = data?.accessToken || data?.session?.access_token || data?.access_token || data?.token || 'insforge-session';
        return {
            user: {
                id: roleData?.id || data?.user?.id || data?.id,
                email: body.email,
                first_name: roleData?.first_name || '',
                last_name: roleData?.last_name || '',
                role: roleData?.role || 'DEVELOPER',
                is_active: roleData?.is_active ?? true,
            },
            accessToken,
            refreshToken: data?.refreshToken || data?.session?.refresh_token || 'insforge-managed',
        };
    },

    'POST /auth/register': async (body) => {
        const { data, error } = await insforge.auth.signUp({
            email: body.email, password: body.password,
            name: `${body.first_name} ${body.last_name}`,
        });
        if (error) throw error;
        await insforge.database.from('user_roles').insert({
            id: data.user.id, email: body.email,
            first_name: body.first_name, last_name: body.last_name,
            role: body.role || 'DEVELOPER',
        });
        return data;
    },

    'POST /auth/refresh': async () => {
        const { data } = await insforge.auth.getCurrentSession();
        if (!data?.session) throw new Error('No active session');
        return { accessToken: data.session.accessToken, refreshToken: 'insforge-managed' };
    },
};

// ==================== SMART PROXY ====================
async function routeRequest(method, url, body) {
    const path = urlPath(url);
    const params = parseQueryParams(url);

    // Check exact route match first
    const routeKey = `${method} ${path}`;
    if (routes[routeKey]) {
        return routes[routeKey](body);
    }

    // --- LEADS ---
    if (path === '/leads' && method === 'GET') {
        return await getLeads(params);
    }
    if (path === '/leads/kanban' && method === 'GET') {
        return await getLeadsKanban();
    }
    if (path === '/leads/check-duplicate' && method === 'GET') {
        const { data } = await insforge.database.from('leads')
            .select('id, name, email').eq('email', params.email).maybeSingle();
        return { exists: !!data, lead: data };
    }
    if (path === '/leads' && method === 'POST') {
        // Calculate score
        let score = 0;
        if (body.email) score += 20;
        if (body.phone) score += 15;
        if (body.company) score += 15;
        const { data, error } = await insforge.database.from('leads')
            .insert({ ...body, score }).select('*, assigned_user:user_roles!leads_assigned_user_id_fkey(id, first_name, last_name)').single();
        if (error) throw error;
        return data;
    }
    if (path.match(/^\/leads\/[^/]+$/) && method === 'GET') {
        const id = extractId(url, 'leads');
        const { data, error } = await insforge.database.from('leads')
            .select('*, assigned_user:user_roles!leads_assigned_user_id_fkey(id, first_name, last_name), attachments:lead_attachments(*)').eq('id', id).single();
        if (error) throw error;
        // Attach converted client info if exists
        if (data) {
            const { data: clientData } = await insforge.database.from('clients')
                .select('id, name, frozen').eq('lead_id', id).is('deleted_at', null).maybeSingle();
            if (clientData) data.converted_client = clientData;
        }
        return data;
    }
    if (path.match(/^\/leads\/[^/]+$/) && method === 'PUT') {
        const id = extractId(url, 'leads');
        // If stage is being changed, route through edge function for business logic
        if (body.stage) {
            const { data: currentLead } = await insforge.database.from('leads').select('stage').eq('id', id).single();
            if (currentLead && currentLead.stage !== body.stage) {
                try {
                    const { data: efData, error: efError } = await insforge.functions.invoke('lead-convert', {
                        body: { action: 'updateStage', leadId: id, updateData: body }
                    });
                    if (efError) throw efError;
                    // Edge function returns a Response, parse it
                    const result = typeof efData === 'string' ? JSON.parse(efData) : efData;
                    if (result?.error) throw new Error(result.error);
                    return result;
                } catch (efErr) {
                    // If edge function fails, fall back to direct update for non-critical stage changes
                    console.warn('Edge function failed, falling back to direct update:', efErr);
                }
            }
        }
        const { data, error } = await insforge.database.from('leads')
            .update({ ...body, updated_at: new Date().toISOString() }).eq('id', id)
            .select('*, assigned_user:user_roles!leads_assigned_user_id_fkey(id, first_name, last_name)').single();
        if (error) throw error;
        return data;
    }
    if (path.match(/^\/leads\/[^/]+\/stage$/) && (method === 'PATCH' || method === 'PUT')) {
        const id = extractId(url, 'leads');
        const { stage, lost_reason } = body;

        // Get current lead
        const { data: currentLead, error: leadErr } = await insforge.database.from('leads')
            .select('*').eq('id', id).single();
        if (leadErr || !currentLead) throw new Error('Lead not found');

        // Validate LOST requires reason
        if (stage === 'LOST' && currentLead.stage !== 'LOST' && !lost_reason) {
            throw { response: { data: { error: 'A reason is required when marking a lead as Lost' } } };
        }

        // If moving away from WON, freeze linked client
        if (currentLead.stage === 'WON' && stage && stage !== 'WON') {
            const { data: linkedClient } = await insforge.database.from('clients')
                .select('id').eq('lead_id', id).is('deleted_at', null).maybeSingle();
            if (linkedClient) {
                await insforge.database.from('clients')
                    .update({ frozen: true, updated_at: new Date().toISOString() })
                    .eq('id', linkedClient.id);
            }
        }

        // If moving to WON, unfreeze existing client OR auto-convert lead to client
        if (stage === 'WON' && currentLead.stage !== 'WON') {
            const { data: existingClient } = await insforge.database.from('clients')
                .select('id').eq('lead_id', id).maybeSingle();

            if (existingClient) {
                // Client exists — unfreeze and restore
                await insforge.database.from('clients')
                    .update({ frozen: false, deleted_at: null, updated_at: new Date().toISOString() })
                    .eq('id', existingClient.id);
            } else {
                // Auto-convert: check for email duplicate first
                let clientRecord = null;
                if (currentLead.email) {
                    const { data: softDeleted } = await insforge.database.from('clients')
                        .select('*').eq('email', currentLead.email).not('deleted_at', 'is', null).maybeSingle();
                    if (softDeleted) {
                        const { data: restored } = await insforge.database.from('clients')
                            .update({
                                deleted_at: null, lead_id: id, name: currentLead.name,
                                company: currentLead.company, phone: currentLead.phone, frozen: false,
                                updated_at: new Date().toISOString()
                            }).eq('id', softDeleted.id).select().single();
                        clientRecord = restored;
                    }
                }
                if (!clientRecord) {
                    // Check if active client with same email exists
                    if (currentLead.email) {
                        const { data: emailClient } = await insforge.database.from('clients')
                            .select('id').eq('email', currentLead.email).is('deleted_at', null).maybeSingle();
                        if (emailClient) {
                            // Link existing client instead of creating duplicate
                            await insforge.database.from('leads')
                                .update({ updated_at: new Date().toISOString() }).eq('id', id);
                            clientRecord = emailClient;
                        }
                    }
                }
                if (!clientRecord) {
                    const { data: newClient } = await insforge.database.from('clients')
                        .insert({
                            name: currentLead.name, email: currentLead.email,
                            company: currentLead.company, phone: currentLead.phone, lead_id: id
                        }).select().single();
                    clientRecord = newClient;
                }
                // Create initial project + milestones
                if (clientRecord) {
                    const { data: project } = await insforge.database.from('projects')
                        .insert({
                            client_id: clientRecord.id,
                            title: `${currentLead.company || currentLead.name} - Initial Project`,
                            description: 'Auto-created project from lead conversion',
                            status: 'PLANNING'
                        }).select().single();
                    if (project) {
                        const milestones = [
                            { label: 'Requirements Gathering', sort_order: 1 },
                            { label: 'Design Phase', sort_order: 2 },
                            { label: 'Development', sort_order: 3 },
                            { label: 'Testing & QA', sort_order: 4 },
                            { label: 'Deployment & Handover', sort_order: 5 }
                        ].map(m => ({ ...m, project_id: project.id, is_completed: false }));
                        await insforge.database.from('project_checklists').insert(milestones);
                    }
                }
            }
        }

        // Update the lead
        const updatePayload = { ...body, updated_at: new Date().toISOString() };
        const { data: updated, error: updateErr } = await insforge.database.from('leads')
            .update(updatePayload).eq('id', id)
            .select('*, assigned_user:user_roles!leads_assigned_user_id_fkey(id, first_name, last_name)').single();
        if (updateErr) throw updateErr;
        return updated;
    }
    if (path.match(/^\/leads\/[^/]+\/convert$/) && method === 'POST') {
        const id = extractId(url, 'leads');
        const { data, error } = await insforge.functions.invoke('lead-convert', {
            body: { action: 'convert', leadId: id }
        });
        if (error) throw error;
        return data;
    }
    if (path.match(/^\/leads\/[^/]+$/) && method === 'DELETE') {
        const id = extractId(url, 'leads');
        const { error } = await insforge.database.from('leads').delete().eq('id', id);
        if (error) throw error;
        return { message: 'Lead deleted' };
    }

    // --- CLIENTS ---
    if (path === '/clients' && method === 'GET') {
        return await getClients(params);
    }
    if (path.match(/^\/clients\/[^/]+$/) && method === 'GET') {
        const id = extractId(url, 'clients');
        const { data, error } = await insforge.database.from('clients')
            .select('*, projects(*), invoices(*, payments(*)), plan:service_plans(*)').eq('id', id).is('deleted_at', null).single();
        if (error) throw error;
        return data;
    }
    if (path === '/clients' && method === 'POST') {
        const { data, error } = await insforge.database.from('clients').insert(body).select().single();
        if (error) throw error;
        return data;
    }
    if (path.match(/^\/clients\/[^/]+$/) && method === 'PUT') {
        const id = extractId(url, 'clients');
        const { data, error } = await insforge.database.from('clients')
            .update({ ...body, updated_at: new Date().toISOString() }).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }
    if (path.match(/^\/clients\/[^/]+$/) && method === 'DELETE') {
        const id = extractId(url, 'clients');
        const { data, error } = await insforge.functions.invoke('client-delete', { body: { client_id: id } });
        if (error) throw error;
        return data;
    }
    if (path.match(/^\/clients\/[^/]+\/credentials$/) && method === 'GET') {
        const id = extractId(url, 'clients');
        const { data, error } = await insforge.functions.invoke('hosting-credentials', { body: { action: 'decrypt', client_id: id } });
        if (error) throw error;
        return data?.data || null;
    }
    if (path.match(/^\/clients\/[^/]+\/credentials$/) && method === 'POST') {
        const id = extractId(url, 'clients');
        const { data, error } = await insforge.functions.invoke('hosting-credentials', { body: { action: 'encrypt', client_id: id, credentials: body } });
        if (error) throw error;
        return data;
    }

    // --- PROJECTS ---
    if (path === '/projects' && method === 'GET') {
        return await getProjects(params);
    }
    if (path.match(/^\/projects\/[^/]+$/) && !path.includes('checklist') && !path.includes('files') && method === 'GET') {
        const id = extractId(url, 'projects');
        const { data, error } = await insforge.database.from('projects')
            .select('*, client:clients(id, name, company), tasks(*, assigned_user:user_roles!tasks_assigned_user_id_fkey(id, first_name, last_name)), files:project_files(*), checklist:project_checklists(*), invoices(*)').eq('id', id).single();
        if (error) throw error;
        // Sort checklist by sort_order
        if (data?.checklist) data.checklist.sort((a, b) => a.sort_order - b.sort_order);
        return data;
    }
    if (path === '/projects' && method === 'POST') {
        const { data, error } = await insforge.database.from('projects')
            .insert(body).select('*, client:clients(id, name, company)').single();
        if (error) throw error;
        if (data) {
            const milestones = [
                { label: 'Requirements Gathering', sort_order: 1 },
                { label: 'Design Phase', sort_order: 2 },
                { label: 'Development', sort_order: 3 },
                { label: 'Testing & QA', sort_order: 4 },
                { label: 'Deployment & Handover', sort_order: 5 }
            ].map(m => ({ ...m, project_id: data.id, is_completed: false }));
            await insforge.database.from('project_checklists').insert(milestones);
        }
        return data;
    }
    if (path.match(/^\/projects\/[^/]+$/) && method === 'PUT') {
        const id = extractId(url, 'projects');
        const { data, error } = await insforge.database.from('projects')
            .update({ ...body, updated_at: new Date().toISOString() }).eq('id', id)
            .select('*, client:clients(id, name, company)').single();
        if (error) throw error;
        return data;
    }
    if (path.match(/^\/projects\/[^/]+$/) && method === 'DELETE') {
        const id = extractId(url, 'projects');
        await insforge.database.from('project_checklists').delete().eq('project_id', id);
        await insforge.database.from('project_files').delete().eq('project_id', id);
        await insforge.database.from('tasks').delete().eq('project_id', id);
        const { error } = await insforge.database.from('projects').delete().eq('id', id);
        if (error) throw error;
        return { message: 'Project deleted' };
    }

    // --- PROJECT CHECKLIST ---
    if (path.match(/^\/projects\/[^/]+\/checklist$/) && method === 'POST') {
        const projectId = extractId(url, 'projects');
        const { data: existing } = await insforge.database.from('project_checklists')
            .select('sort_order').eq('project_id', projectId).order('sort_order', { ascending: false }).limit(1);
        const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 1;
        const { data, error } = await insforge.database.from('project_checklists')
            .insert({ ...body, project_id: projectId, sort_order: nextOrder, is_completed: false }).select().single();
        if (error) throw error;
        return data;
    }
    if (path.match(/^\/projects\/checklist\/[^/]+\/toggle$/) && method === 'PUT') {
        const itemId = url.split('/checklist/')[1].split('/toggle')[0];
        const { data: item } = await insforge.database.from('project_checklists').select('is_completed').eq('id', itemId).single();
        const newState = !(item?.is_completed);
        const { data, error } = await insforge.database.from('project_checklists')
            .update({ is_completed: newState, completed_at: newState ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
            .eq('id', itemId).select().single();
        if (error) throw error;
        return data;
    }
    if (path.match(/^\/projects\/checklist\/[^/]+$/) && method === 'DELETE') {
        const itemId = url.split('/checklist/')[1];
        const { error } = await insforge.database.from('project_checklists').delete().eq('id', itemId);
        if (error) throw error;
        return { message: 'Deleted' };
    }

    // --- PROJECT FILES ---
    if (path.match(/^\/projects\/[^/]+\/files$/) && method === 'POST') {
        // File upload — store via InsForge storage
        if (body instanceof FormData) {
            const file = body.get('file');
            const projectId = extractId(url, 'projects');
            if (file && projectId) {
                const fileName = `projects/${projectId}/${Date.now()}_${file.name}`;
                const { data: uploadData, error: uploadErr } = await insforge.storage.from('attachments').upload(fileName, file);
                if (uploadErr) throw uploadErr;
                const filePath = uploadData?.path || fileName;
                const { data, error } = await insforge.database.from('project_files')
                    .insert({ project_id: projectId, filename: file.name, filepath: filePath, mimetype: file.type, size: file.size }).select().single();
                if (error) throw error;
                return data;
            }
        }
        return null;
    }
    if (path.match(/^\/projects\/files\/[^/]+$/) && method === 'DELETE') {
        const fileId = url.split('/files/')[1];
        const { error } = await insforge.database.from('project_files').delete().eq('id', fileId);
        if (error) throw error;
        return { message: 'Deleted' };
    }

    // --- TASKS ---
    if (path === '/tasks' && method === 'GET') {
        return await getTasks(params);
    }
    if (path.match(/^\/tasks\/[^/]+$/) && method === 'GET') {
        const id = extractId(url, 'tasks');
        const { data, error } = await insforge.database.from('tasks')
            .select('*, project:projects(id, title), assigned_user:user_roles!tasks_assigned_user_id_fkey(id, first_name, last_name)').eq('id', id).single();
        if (error) throw error;
        return data;
    }
    if (path === '/tasks' && method === 'POST') {
        const { data, error } = await insforge.database.from('tasks')
            .insert(body).select('*, project:projects(id, title), assigned_user:user_roles!tasks_assigned_user_id_fkey(id, first_name, last_name)').single();
        if (error) throw error;
        return data;
    }
    if (path.match(/^\/tasks\/[^/]+$/) && method === 'PUT') {
        const id = extractId(url, 'tasks');
        const { data, error } = await insforge.database.from('tasks')
            .update({ ...body, updated_at: new Date().toISOString() }).eq('id', id)
            .select('*, project:projects(id, title), assigned_user:user_roles!tasks_assigned_user_id_fkey(id, first_name, last_name)').single();
        if (error) throw error;
        return data;
    }
    if (path.match(/^\/tasks\/[^/]+$/) && method === 'DELETE') {
        const id = extractId(url, 'tasks');
        const { error } = await insforge.database.from('tasks').delete().eq('id', id);
        if (error) throw error;
        return { message: 'Task deleted' };
    }

    // --- INVOICES ---
    if (path === '/invoices' && method === 'GET') {
        return await getInvoices(params);
    }
    if (path === '/invoices/taxes' && method === 'GET') {
        const { data, error } = await insforge.database.from('tax_configs').select('*');
        if (error) throw error;
        return data;
    }
    if (path.match(/^\/invoices\/[^/]+$/) && method === 'GET') {
        const id = extractId(url, 'invoices');
        const { data, error } = await insforge.database.from('invoices')
            .select('*, client:clients(id, name, company, email, gst_number), items:invoice_items(*), payments(*), project:projects(id, title)').eq('id', id).single();
        if (error) throw error;
        return data;
    }
    if (path === '/invoices' && method === 'POST') {
        const { data, error } = await insforge.functions.invoke('invoice-create', { body });
        if (error) throw error;
        return data;
    }
    if (path.match(/^\/invoices\/[^/]+$/) && method === 'PUT') {
        const id = extractId(url, 'invoices');
        const { data, error } = await insforge.functions.invoke('invoice-update', { body: { invoice_id: id, ...body } });
        if (error) throw error;
        return data;
    }
    if (path.match(/^\/invoices\/[^/]+$/) && method === 'DELETE') {
        const id = extractId(url, 'invoices');
        const { count } = await insforge.database.from('payments').select('id', { count: 'exact', head: true }).eq('invoice_id', id);
        if (count && count > 0) throw new Error('Cannot delete invoice with recorded payments');
        await insforge.database.from('invoice_items').delete().eq('invoice_id', id);
        const { error } = await insforge.database.from('invoices').delete().eq('id', id);
        if (error) throw error;
        return { message: 'Invoice deleted' };
    }

    // --- PAYMENTS ---
    if (path === '/payments' && method === 'GET') {
        return await getPayments(params);
    }
    if (path.match(/^\/invoices\/[^/]+\/payments$/) && method === 'GET') {
        const invId = extractId(url, 'invoices');
        const { data, error } = await insforge.database.from('payments').select('*').eq('invoice_id', invId).order('date', { ascending: false });
        if (error) throw error;
        return data;
    }
    if (path === '/payments' && method === 'POST') {
        const { data, error } = await insforge.functions.invoke('payment-create', { body });
        if (error) throw error;
        return data;
    }
    if (path.match(/^\/payments\/[^/]+$/) && method === 'DELETE') {
        const id = extractId(url, 'payments');
        const { data, error } = await insforge.functions.invoke('payment-delete', { body: { payment_id: id } });
        if (error) throw error;
        return data;
    }

    // --- REPORTS / DASHBOARD ---
    if (path === '/reports/dashboard' || path === '/reports/summary') {
        const { data, error } = await insforge.functions.invoke('dashboard-summary', { body: params });
        if (error) throw error;
        // Edge functions may wrap result in data.data
        return data?.data || data || {};
    }
    if (path === '/reports/monthly-revenue') {
        const { data, error } = await insforge.functions.invoke('dashboard-summary', { body: params });
        if (error) throw error;
        return data?.revenue;
    }
    if (path === '/reports/lead-conversion') {
        const { data, error } = await insforge.functions.invoke('dashboard-summary', { body: params });
        if (error) throw error;
        return data?.conversion;
    }
    if (path === '/reports/leads-by-source') {
        const { data, error } = await insforge.functions.invoke('dashboard-summary', { body: params });
        if (error) throw error;
        return data?.sources;
    }
    if (path === '/reports/deal-size') {
        const { data, error } = await insforge.functions.invoke('dashboard-summary', { body: params });
        if (error) throw error;
        return data?.dealSize;
    }
    if (path === '/reports/project-stats') {
        const { data, error } = await insforge.functions.invoke('dashboard-summary', { body: params });
        if (error) throw error;
        return data?.projects;
    }
    if (path === '/reports/outstanding') {
        const { data, error } = await insforge.functions.invoke('dashboard-summary', { body: params });
        if (error) throw error;
        return data?.outstanding;
    }

    // --- SEARCH ---
    if (path === '/search' && method === 'GET') {
        const q = params.q || '';
        if (!q || q.length < 2) return [];
        const { data, error } = await insforge.functions.invoke('global-search', {
            method: 'POST', body: { q }
        });
        if (error) throw error;
        return data;
    }

    // --- ADMIN ---
    if (path === '/admin/plans' && method === 'GET') {
        const { data, error } = await insforge.database.from('service_plans').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }
    if (path === '/admin/plans' && method === 'POST') {
        const { data, error } = await insforge.database.from('service_plans').insert(body).select().single();
        if (error) throw error;
        return data;
    }
    if (path.match(/^\/admin\/plans\/[^/]+$/) && method === 'PUT') {
        const id = url.split('/plans/')[1];
        const { data, error } = await insforge.database.from('service_plans')
            .update({ ...body, updated_at: new Date().toISOString() }).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }
    if (path.match(/^\/admin\/plans\/[^/]+$/) && method === 'DELETE') {
        const id = url.split('/plans/')[1];
        const { error } = await insforge.database.from('service_plans').delete().eq('id', id);
        if (error) throw error;
        return { message: 'Deleted' };
    }

    if (path === '/admin/coupons' && method === 'GET') {
        const { data, error } = await insforge.database.from('coupons').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }
    if (path === '/admin/coupons' && method === 'POST') {
        const { data, error } = await insforge.database.from('coupons').insert(body).select().single();
        if (error) throw error;
        return data;
    }
    if (path.match(/^\/admin\/coupons\/[^/]+$/) && method === 'PUT') {
        const id = url.split('/coupons/')[1];
        const { data, error } = await insforge.database.from('coupons')
            .update({ ...body, updated_at: new Date().toISOString() }).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }
    if (path.match(/^\/admin\/coupons\/[^/]+$/) && method === 'DELETE') {
        const id = url.split('/coupons/')[1];
        const { error } = await insforge.database.from('coupons').delete().eq('id', id);
        if (error) throw error;
        return { message: 'Deleted' };
    }

    if (path === '/admin/taxes' && method === 'GET') {
        const { data, error } = await insforge.database.from('tax_configs').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }
    if (path === '/admin/taxes' && method === 'POST') {
        const { data, error } = await insforge.database.from('tax_configs').insert(body).select().single();
        if (error) throw error;
        return data;
    }

    if (path === '/admin/currencies' && method === 'GET') {
        const { data, error } = await insforge.database.from('currency_configs').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }
    if (path === '/admin/currencies' && method === 'POST') {
        const { data, error } = await insforge.database.from('currency_configs').insert(body).select().single();
        if (error) throw error;
        return data;
    }

    if (path === '/admin/users' || path === '/users') {
        if (method === 'GET') {
            const { data, error } = await insforge.database.from('user_roles').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        }
        if (method === 'POST') {
            return routes['POST /auth/register'](body);
        }
    }
    if ((path.match(/^\/admin\/users\/[^/]+$/) || path.match(/^\/users\/[^/]+$/)) && method === 'PUT') {
        const id = path.split('/').pop();
        const { data, error } = await insforge.database.from('user_roles')
            .update({ ...body, updated_at: new Date().toISOString() }).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    // Admin - Deleted Clients
    if (path === '/admin/deleted-clients' && method === 'GET') {
        const { data, error } = await insforge.database.from('clients')
            .select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
        if (error) throw error;
        return data;
    }
    if (path.match(/^\/admin\/deleted-clients\/[^/]+\/restore$/) && method === 'POST') {
        const id = url.split('/deleted-clients/')[1].split('/restore')[0];
        const { data, error } = await insforge.database.from('clients')
            .update({ deleted_at: null, updated_at: new Date().toISOString() }).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }
    if (path.match(/^\/admin\/deleted-clients\/[^/]+$/) && method === 'DELETE') {
        const id = url.split('/deleted-clients/')[1];
        const { data, error } = await insforge.functions.invoke('client-permanent-delete', { body: { client_id: id } });
        if (error) throw error;
        return data;
    }

    // Admin - Export
    if (path.match(/^\/admin\/export\/[^/]+$/) && method === 'GET') {
        const table = url.split('/export/')[1];
        const { data, error } = await insforge.database.from(table).select('*');
        if (error) throw error;
        return data;
    }

    // --- ACTIVITY ---
    if (path === '/activity' && method === 'GET') {
        const page = parseInt(params.page) || 1;
        const limit = parseInt(params.limit) || 50;
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        const { data, count, error } = await insforge.database.from('revision_history')
            .select('*', { count: 'exact' }).order('changed_at', { ascending: false }).range(from, to);
        if (error) throw error;
        return { activities: data, pagination: { total: count, page, limit, pages: Math.ceil((count || 0) / limit) } };
    }

    // --- FALLBACK ---
    console.warn(`[InsForge API] Unhandled route: ${method} ${url}`);
    return null;
}

// ==================== LIST QUERY HELPERS ====================
async function getLeads(params) {
    let query = insforge.database.from('leads')
        .select('*, assigned_user:user_roles!leads_assigned_user_id_fkey(id, first_name, last_name)', { count: 'exact' });
    if (params.stage) query = query.eq('stage', params.stage);
    if (params.source) query = query.eq('source', params.source);
    if (params.assigned_user_id) query = query.eq('assigned_user_id', params.assigned_user_id);
    if (params.search) query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%,company.ilike.%${params.search}%`);
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 25;
    query = query.order('created_at', { ascending: false }).range((page - 1) * limit, page * limit - 1);
    const { data, count, error } = await query;
    if (error) throw error;
    return { leads: data, total: count, page, limit };
}

async function getLeadsKanban() {
    const { data, error } = await insforge.database.from('leads')
        .select('*, assigned_user:user_roles!leads_assigned_user_id_fkey(id, first_name, last_name)')
        .order('updated_at', { ascending: false });
    if (error) throw error;
    const kanban = {};
    for (const lead of (data || [])) {
        if (!kanban[lead.stage]) kanban[lead.stage] = [];
        kanban[lead.stage].push(lead);
    }
    return kanban;
}

async function getClients(params) {
    let query = insforge.database.from('clients')
        .select('*, plan:service_plans(id, name)', { count: 'exact' }).is('deleted_at', null);
    if (params.search) query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%,company.ilike.%${params.search}%`);
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || params.limit === '100' ? 100 : 25;
    query = query.order('created_at', { ascending: false }).range((page - 1) * limit, page * limit - 1);
    const { data, count, error } = await query;
    if (error) throw error;
    return { clients: data, total: count, page, limit };
}

async function getProjects(params) {
    let query = insforge.database.from('projects')
        .select('*, client:clients(id, name, company)', { count: 'exact' });
    if (params.client_id) query = query.eq('client_id', params.client_id);
    if (params.status) query = query.eq('status', params.status);
    if (params.search) query = query.ilike('title', `%${params.search}%`);
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 25;
    query = query.order('created_at', { ascending: false }).range((page - 1) * limit, page * limit - 1);
    const { data, count, error } = await query;
    if (error) throw error;
    return { projects: data, total: count, page, limit };
}

async function getTasks(params) {
    let query = insforge.database.from('tasks')
        .select('*, project:projects(id, title), assigned_user:user_roles!tasks_assigned_user_id_fkey(id, first_name, last_name)', { count: 'exact' });
    if (params.project_id) query = query.eq('project_id', params.project_id);
    if (params.status) query = query.eq('status', params.status);
    if (params.assigned_user_id) query = query.eq('assigned_user_id', params.assigned_user_id);
    if (params.search) query = query.ilike('title', `%${params.search}%`);
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 25;
    query = query.order('created_at', { ascending: false }).range((page - 1) * limit, page * limit - 1);
    const { data, count, error } = await query;
    if (error) throw error;
    return { tasks: data, total: count, page, limit };
}

async function getInvoices(params) {
    let query = insforge.database.from('invoices')
        .select('*, client:clients(id, name, company), items:invoice_items(*)', { count: 'exact' });
    if (params.client_id) query = query.eq('client_id', params.client_id);
    if (params.status) query = query.eq('status', params.status);
    if (params.search) query = query.ilike('invoice_number', `%${params.search}%`);
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 25;
    query = query.order('created_at', { ascending: false }).range((page - 1) * limit, page * limit - 1);
    const { data, count, error } = await query;
    if (error) throw error;
    return { invoices: data, total: count, page, limit };
}

async function getPayments(params) {
    let query = insforge.database.from('payments')
        .select('*, invoice:invoices(id, invoice_number, client:clients(id, name))', { count: 'exact' });
    if (params.invoice_id) query = query.eq('invoice_id', params.invoice_id);
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 25;
    query = query.order('date', { ascending: false }).range((page - 1) * limit, page * limit - 1);
    const { data, count, error } = await query;
    if (error) throw error;
    return { payments: data, total: count, page, limit };
}

// ==================== DEFAULT EXPORT: AXIOS-COMPATIBLE PROXY ====================
const api = {
    get: (url) => routeRequest('GET', url, null).then(data => ({ data })),
    post: (url, body, config) => routeRequest('POST', url, body).then(data => ({ data })),
    put: (url, body) => routeRequest('PUT', url, body).then(data => ({ data })),
    patch: (url, body) => routeRequest('PATCH', url, body).then(data => ({ data })),
    delete: (url) => routeRequest('DELETE', url, null).then(data => ({ data })),
};

export default api;
