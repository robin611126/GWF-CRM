import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
    // List all leads and clients so we can see Shivam
    const leads = await p.lead.findMany({ select: { id: true, name: true, stage: true } });
    console.log('All leads:');
    leads.forEach(l => console.log(` - ${l.name} (${l.stage}) [${l.id}]`));

    const clients = await p.client.findMany({ select: { id: true, name: true, lead_id: true } });
    console.log('\nAll clients:');
    clients.forEach(c => console.log(` - ${c.name} lead_id:${c.lead_id} [${c.id}]`));

    // Delete all (will cascade to clean up)
    // Find client linked to a lead that is no longer WON
    for (const client of clients) {
        if (!client.lead_id) continue;
        const lead = leads.find(l => l.id === client.lead_id);
        if (lead && lead.stage !== 'WON') {
            console.log(`\nDeleting stale client "${client.name}" (lead is now ${lead.stage})`);
            await p.project.deleteMany({ where: { client_id: client.id } });
            await p.client.delete({ where: { id: client.id } });
            console.log('Done!');
        }
    }

    await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
