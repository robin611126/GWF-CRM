import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
    const leads = await p.lead.findMany({ select: { id: true, name: true, email: true, stage: true } });
    console.log('All leads:');
    leads.forEach(l => console.log(` - ${l.name} | email: ${l.email} | stage: ${l.stage}`));
    await p.$disconnect();
}
main();
