import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database';
import { config } from '../../config';
import { ConflictError, NotFoundError, ValidationError } from '../../utils/errors';

export class AuthService {
    async register(data: {
        email: string;
        password: string;
        first_name: string;
        last_name: string;
        role: any;
    }) {
        const existing = await prisma.user.findUnique({ where: { email: data.email } });
        if (existing) {
            throw new ConflictError('Email already registered');
        }

        const password_hash = await bcrypt.hash(data.password, 12);
        const user = await prisma.user.create({
            data: {
                email: data.email,
                password_hash,
                first_name: data.first_name,
                last_name: data.last_name,
                role: data.role,
            },
            select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
                role: true,
                is_active: true,
                created_at: true,
            },
        });

        return user;
    }

    async login(email: string, password: string) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new ValidationError('Invalid email or password');
        }

        if (!user.is_active) {
            throw new ValidationError('Account is deactivated');
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            throw new ValidationError('Invalid email or password');
        }

        const accessToken = jwt.sign(
            { userId: user.id, role: user.role },
            config.jwt.secret,
            { expiresIn: config.jwt.expiry as any }
        );

        const refreshToken = jwt.sign(
            { userId: user.id },
            config.jwt.refreshSecret,
            { expiresIn: config.jwt.refreshExpiry as any }
        );

        return {
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
            },
            accessToken,
            refreshToken,
        };
    }

    async refresh(refreshToken: string) {
        try {
            const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as any;
            const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

            if (!user || !user.is_active) {
                throw new ValidationError('Invalid refresh token');
            }

            const accessToken = jwt.sign(
                { userId: user.id, role: user.role },
                config.jwt.secret,
                { expiresIn: config.jwt.expiry as any }
            );

            const newRefreshToken = jwt.sign(
                { userId: user.id },
                config.jwt.refreshSecret,
                { expiresIn: config.jwt.refreshExpiry as any }
            );

            return { accessToken, refreshToken: newRefreshToken };
        } catch (error) {
            throw new ValidationError('Invalid or expired refresh token');
        }
    }

    async getProfile(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
                role: true,
                is_active: true,
                created_at: true,
                updated_at: true,
            },
        });

        if (!user) {
            throw new NotFoundError('User');
        }

        return user;
    }
}

export const authService = new AuthService();
