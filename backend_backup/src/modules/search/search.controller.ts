import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const globalSearch = async (req: Request, res: Response) => {
    try {
        const query = req.query.q as string;
        if (!query || query.length < 2) {
            return res.json([]);
        }

        const searchTerm = `%${query}%`;

        // Execute queries concurrently using raw SQL for case-insensitive LIKE
        const searchTermStr = `%${query}%`;

        const [leads, clients, projects, tasks, invoices] = await Promise.all([
            // Search Leads
            prisma.$queryRaw`
                SELECT id, name as title, email as subtitle, 'lead' as type 
                FROM "leads" 
                WHERE name LIKE ${searchTermStr} OR email LIKE ${searchTermStr} OR company LIKE ${searchTermStr}
                LIMIT 5`,
            // Search Clients
            prisma.$queryRaw`
                SELECT id, name as title, email as subtitle, 'client' as type 
                FROM "clients" 
                WHERE name LIKE ${searchTermStr} OR email LIKE ${searchTermStr} OR company LIKE ${searchTermStr}
                LIMIT 5`,
            // Search Projects
            prisma.$queryRaw`
                SELECT id, title, status as subtitle, 'project' as type 
                FROM "projects" 
                WHERE title LIKE ${searchTermStr}
                LIMIT 5`,
            // Search Tasks
            prisma.$queryRaw`
                SELECT id, title, status as subtitle, 'task' as type 
                FROM "tasks" 
                WHERE title LIKE ${searchTermStr}
                LIMIT 5`,
            // Search Invoices
            prisma.$queryRaw`
                SELECT id, invoice_number as title, status as subtitle, 'invoice' as type 
                FROM "invoices" 
                WHERE invoice_number LIKE ${searchTermStr}
                LIMIT 5`
        ]);

        const results = [
            ...(leads as any[]),
            ...(clients as any[]),
            ...(projects as any[]),
            ...(tasks as any[]),
            ...(invoices as any[])
        ];

        res.json(results);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Failed to perform search' });
    }
};
