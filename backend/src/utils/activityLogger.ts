import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const logActivity = async (
    userId: string,
    entityType: string,
    entityId: string,
    field: string,
    oldValue?: string | null,
    newValue?: string | null
) => {
    try {
        await prisma.revisionHistory.create({
            data: {
                changed_by: userId,
                entity_type: entityType,
                entity_id: entityId,
                field: field,
                old_value: oldValue || null,
                new_value: newValue || null,
            }
        });
    } catch (error) {
        console.error('Failed to log activity:', error);
        // We typically don't want to throw and crash the main request if logging fails
    }
};
