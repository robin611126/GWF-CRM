import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
    // Find WON leads without a client
    const wonLeads = await p.lead.findMany({
        where: { stage: 'WON' },
        include: { converted_client: { select: { id: true } } }
    });
    for (const lead of wonLeads) {
        if (!lead.converted_client) {
            console.log(`Creating client for orphaned WON lead: ${lead.name}`);
            const client = await p.client.create({
                data: { name: lead.name, email: lead.email, company: lead.company, phone: lead.phone, lead_id: lead.id }
            });
            await p.project.create({
                data: { name: `${lead.name}'s Project`, client_id: client.id, status: 'ACTIVE' }
            });
            console.log(`  -> Created client + project for ${lead.name}`);
        } else {
            console.log(`${lead.name} already has a client`);
        }
    }
    await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
