import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding GWF CRM with initial basic setup...\n');

    // Create Admin User
    const adminPassword = await bcrypt.hash('admin123', 12);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@gwfcrm.com' },
        update: {},
        create: {
            email: 'admin@gwfcrm.com',
            password_hash: adminPassword,
            first_name: 'Shiva',
            last_name: 'Kumar',
            role: 'ADMIN',
        },
    });
    console.log('✅ Admin user created:', admin.email);

    // Create team members
    const password = await bcrypt.hash('password123', 12);
    const users = [
        { email: 'sales@gwfcrm.com', first_name: 'Priya', last_name: 'Sharma', role: 'SALES' },
        { email: 'pm@gwfcrm.com', first_name: 'Arjun', last_name: 'Patel', role: 'PROJECT_MANAGER' },
        { email: 'dev@gwfcrm.com', first_name: 'Rohit', last_name: 'Verma', role: 'DEVELOPER' },
        { email: 'billing@gwfcrm.com', first_name: 'Neha', last_name: 'Gupta', role: 'BILLING' },
    ];

    for (const u of users) {
        const user = await prisma.user.upsert({
            where: { email: u.email },
            update: {},
            create: { ...u, password_hash: password },
        });
        console.log(`✅ ${u.role} user created:`, user.email);
    }

    // Create realistic service plans
    const plans = [
        { name: 'Landing Page', description: 'Single-page responsive website', price: 9999, features: '1 page, Mobile responsive, Contact form' },
        { name: 'Business Website', description: 'Multi-page professional website', price: 24999, features: '5-10 pages, SEO optimization' },
        { name: 'E-Commerce Store', description: 'Online store with payment gateway', price: 49999, features: 'Product catalog, Payment gateway' },
        { name: 'Custom Web App', description: 'Tailored web application', price: 99999, features: 'Custom UI/UX, REST API' },
    ];

    for (const p of plans) {
        await prisma.servicePlan.create({ data: p });
    }
    console.log('✅ Service plans created');

    // Create tax config
    await prisma.taxConfig.create({ data: { name: 'GST', rate: 18, is_default: true } });
    await prisma.taxConfig.create({ data: { name: 'IGST', rate: 18, is_default: false } });
    console.log('✅ Tax configs created');

    // Create currency config
    await prisma.currencyConfig.create({ data: { code: 'INR', symbol: '₹', name: 'Indian Rupee', is_default: true } });
    await prisma.currencyConfig.create({ data: { code: 'USD', symbol: '$', name: 'US Dollar', is_default: false } });
    console.log('✅ Currency configs created');

    console.log('\n🎉 Clean seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
