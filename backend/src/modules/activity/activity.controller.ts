import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getActivityFeed = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = (page - 1) * limit;

        const activities = await prisma.revisionHistory.findMany({
            take: limit,
            skip: offset,
            orderBy: {
                changed_at: 'desc'
            },
            include: {
                changed_by_user: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true
                    }
                }
            }
        });

        const total = await prisma.revisionHistory.count();

        // Optional: Enhance the response with actual entity names if needed, 
        // but for a v1, frontend can parse "Lead 123 created"
        res.status(200).json({
            activities,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching activity feed:', error);
        res.status(500).json({ error: 'Failed to fetch activity feed' });
    }
};
