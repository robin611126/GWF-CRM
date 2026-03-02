import { createClient } from 'npm:@insforge/sdk';

async function getKey(): Promise<CryptoKey> {
    const keyStr = Deno.env.get('ENCRYPTION_KEY') || 'gwf-crm-32char-encrypt-key-prod!!';
    const enc = new TextEncoder();
    const keyData = await crypto.subtle.digest('SHA-256', enc.encode(keyStr));
    return await crypto.subtle.importKey('raw', keyData, { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']);
}

async function encrypt(text: string): Promise<string> {
    const key = await getKey();
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const enc = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, enc.encode(text));
    const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
    const encHex = Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join('');
    return ivHex + ':' + encHex;
}

async function decrypt(encryptedText: string): Promise<string> {
    const key = await getKey();
    const parts = encryptedText.split(':');
    const iv = new Uint8Array(parts[0].match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    const encrypted = new Uint8Array(parts[1].match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, encrypted);
    return new TextDecoder().decode(decrypted);
}

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
        const { action, client_id, credentials } = await req.json();

        if (action === 'encrypt') {
            const encrypted = await encrypt(JSON.stringify(credentials));
            await client.database.from('clients')
                .update({ hosting_credentials_encrypted: encrypted, updated_at: new Date().toISOString() })
                .eq('id', client_id);
            return new Response(JSON.stringify({ success: true }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'decrypt') {
            const { data: clientData } = await client.database
                .from('clients').select('hosting_credentials_encrypted').eq('id', client_id).is('deleted_at', null).single();

            if (!clientData || !clientData.hosting_credentials_encrypted) {
                return new Response(JSON.stringify({ data: null }), {
                    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const decrypted = await decrypt(clientData.hosting_credentials_encrypted);
            return new Response(JSON.stringify({ data: JSON.parse(decrypted) }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
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
