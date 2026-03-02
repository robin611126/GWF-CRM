import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
    // Delete in proper order (projects depend on clients, attachments depend on leads)
    const projects = await p.project.deleteMany({});
    console.log('Deleted projects:', projects.count);
    const clients = await p.client.deleteMany({});
    console.log('Deleted clients:', clients.count);
    const attachments = await p.leadAttachment.deleteMany({});
    console.log('Deleted lead attachments:', attachments.count);
    const leads = await p.lead.deleteMany({});
    console.log('Deleted leads:', leads.count);
    await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
