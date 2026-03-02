import prisma from '../../config/database';
import { NotFoundError, ValidationError, UnprocessableError } from '../../utils/errors';
import { encrypt, decrypt } from '../../utils/encryption';

export class ClientService {
    async create(data: any) {
        // Validate domain format if provided
        if (data.domain) {
            const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
            if (!domainRegex.test(data.domain)) {
                throw new ValidationError('Invalid domain format');
            }
        }

        // Encrypt hosting credentials if provided
        if (data.hosting_credentials) {
            data.hosting_credentials_encrypted = encrypt(JSON.stringify(data.hosting_credentials));
            delete data.hosting_credentials;
        }

        const client = await prisma.client.create({
            data,
            include: { plan: true, _count: { select: { projects: true, invoices: true } } },
        });

        return client;
    }

    async findAll(filters: { page?: number; limit?: number; search?: string }) {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = { deleted_at: null };
        if (filters.search) {
            where.OR = [
                { name: { contains: filters.search } },
                { email: { contains: filters.search } },
                { company: { contains: filters.search } },
            ];
        }

        const [clients, total] = await Promise.all([
            prisma.client.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    plan: true,
                    _count: { select: { projects: true, invoices: true } },
                },
            }),
            prisma.client.count({ where }),
        ]);

        return { clients, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async findById(id: string) {
        const client = await prisma.client.findUnique({
            where: { id },
            include: {
                plan: true,
                projects: { orderBy: { created_at: 'desc' } },
                invoices: { orderBy: { created_at: 'desc' }, include: { items: true } },
            },
        });

        if (!client || client.deleted_at) {
            throw new NotFoundError('Client');
        }

        return client;
    }

    async getDecryptedCredentials(id: string) {
        const client = await prisma.client.findUnique({ where: { id } });
        if (!client || client.deleted_at) {
            throw new NotFoundError('Client');
        }
        if (!client.hosting_credentials_encrypted) {
            return null;
        }
        return JSON.parse(decrypt(client.hosting_credentials_encrypted));
    }

    async update(id: string, data: any) {
        const client = await prisma.client.findUnique({ where: { id } });
        if (!client || client.deleted_at) {
            throw new NotFoundError('Client');
        }

        if (data.domain) {
            const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
            if (!domainRegex.test(data.domain)) {
                throw new ValidationError('Invalid domain format');
            }
        }

        if (data.hosting_credentials) {
            data.hosting_credentials_encrypted = encrypt(JSON.stringify(data.hosting_credentials));
            delete data.hosting_credentials;
        }

        const updated = await prisma.client.update({
            where: { id },
            data,
            include: { plan: true },
        });

        return updated;
    }

    async softDelete(id: string) {
        const client = await prisma.client.findUnique({
            where: { id },
            include: { invoices: { where: { status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } } } },
        });

        if (!client || client.deleted_at) {
            throw new NotFoundError('Client');
        }

        if (client.invoices.length > 0) {
            throw new UnprocessableError('Cannot delete client with unpaid invoices');
        }

        await prisma.$transaction(async (tx) => {
            await tx.client.update({
                where: { id },
                data: {
                    deleted_at: new Date(),
                    lead_id: null
                },
            });

            if (client.lead_id) {
                await tx.lead.update({
                    where: { id: client.lead_id },
                    data: { stage: 'CONTACTED' },
                });
            }
        });

        return { message: 'Client soft-deleted successfully' };
    }
}

export const clientService = new ClientService();
