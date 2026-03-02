import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
    const clients = await p.client.findMany({
        where: { deleted_at: null },
        select: { id: true, name: true, email: true, lead_id: true, created_at: true, deleted_at: true }
    });
    console.log('Active clients:', clients.length);
    console.log(JSON.stringify(clients, null, 2));

    const allClients = await p.client.findMany({
        select: { id: true, name: true, email: true, lead_id: true, created_at: true, deleted_at: true }
    });
    console.log('\nAll clients (including soft-deleted):', allClients.length);
    console.log(JSON.stringify(allClients, null, 2));

    const leads = await p.lead.findMany({
        select: { id: true, name: true, stage: true, email: true }
    });
    console.log('\nAll leads:', leads.length);
    console.log(JSON.stringify(leads, null, 2));

    await p.$disconnect();
}
main();
