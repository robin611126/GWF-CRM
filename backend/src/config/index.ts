import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    jwt: {
        secret: process.env.JWT_SECRET || 'fallback-secret',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
        expiry: process.env.JWT_EXPIRY || '15m',
        refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    },
    encryption: {
        key: process.env.ENCRYPTION_KEY || 'fallback-32char-encrypt-key-dev!!',
    },
    uploadDir: process.env.UPLOAD_DIR || './uploads',
};
