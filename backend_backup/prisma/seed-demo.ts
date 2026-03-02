import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding GWF CRM with realistic agency data...\n');

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

    // Create team members with real Indian names
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

    // Create realistic service plans for web development agency
    const plans = [
        { name: 'Landing Page', description: 'Single-page responsive website for startups', price: 9999, features: '1 page, Mobile responsive, Contact form, WhatsApp integration, SEO basics' },
        { name: 'Business Website', description: 'Multi-page professional business website', price: 24999, features: '5-10 pages, Blog, SEO optimization, Google Analytics, Social media integration, SSL' },
        { name: 'E-Commerce Store', description: 'Full-featured online store with payment gateway', price: 49999, features: 'Product catalog, Payment gateway (Razorpay), Inventory management, Order tracking, Admin panel' },
        { name: 'Custom Web App', description: 'Tailored web application with custom features', price: 99999, features: 'Custom UI/UX, REST API, Database, User authentication, Admin dashboard, Cloud deployment' },
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

    // Create realistic leads
    const salesUser = await prisma.user.findUnique({ where: { email: 'sales@gwfcrm.com' } });
    const sampleLeads = [
        { name: 'Vikram Mehta', email: 'vikram@mehtaTextiles.in', phone: '+91-9823456781', company: 'Mehta Textiles', source: 'WEBSITE', stage: 'NEW', score: 45, assigned_user_id: salesUser?.id, notes: 'Wants an e-commerce website for their textile business. Budget ₹50K-80K.' },
        { name: 'Ananya Reddy', email: 'ananya@greenleaforganic.com', phone: '+91-9912345670', company: 'GreenLeaf Organics', source: 'REFERRAL', stage: 'CONTACTED', score: 72, assigned_user_id: salesUser?.id, notes: 'Referred by Acme Corp. Looking for a product showcase website with ordering system.' },
        { name: 'Rajesh Kumar', email: 'rajesh@kumarbuilders.com', phone: '+91-9876501234', company: 'Kumar Builders', source: 'ADS', stage: 'PROPOSAL_SENT', score: 60, assigned_user_id: salesUser?.id, notes: 'Real estate developer. Needs property listing website with virtual tours.' },
        { name: 'Sneha Iyer', email: 'sneha@iyerlaw.in', company: 'Iyer & Associates', source: 'MANUAL', stage: 'NEGOTIATION', score: 85, assigned_user_id: salesUser?.id, notes: 'Law firm. Wants professional website with case tracking portal. Negotiating custom app features.' },
        { name: 'Amit Shah', email: 'amit@shahelectronics.com', phone: '+91-9834567890', company: 'Shah Electronics', source: 'REFERRAL', stage: 'CONTACTED', score: 55, notes: 'Electronics retailer looking for online store with inventory management.' },
        { name: 'Pooja Desai', email: 'pooja@yogashala.co.in', phone: '+91-9765432100', company: 'Yoga Shala Studio', source: 'WEBSITE', stage: 'NEW', score: 40, notes: 'Yoga studio wants booking website with class schedule and payment integration.' },
        { name: 'Karan Malhotra', email: 'karan@malhotrafoods.com', phone: '+91-9887654321', company: 'Malhotra Foods', source: 'ADS', stage: 'NEW', score: 35, notes: 'Restaurant chain wants online ordering and delivery website.' },
    ];

    for (const l of sampleLeads) {
        await prisma.lead.create({ data: l });
    }
    console.log('✅ Sample leads created');

    // Create Clients
    const starterPlan = await prisma.servicePlan.findFirst({ where: { name: 'Business Website' } });
    const ecommPlan = await prisma.servicePlan.findFirst({ where: { name: 'E-Commerce Store' } });
    const customPlan = await prisma.servicePlan.findFirst({ where: { name: 'Custom Web App' } });

    const client1 = await prisma.client.create({
        data: {
            name: 'Ravi Agarwal',
            email: 'ravi@agarwalexports.com',
            company: 'Agarwal Exports Pvt Ltd',
            phone: '+91-9876543220',
            domain: 'agarwalexports.com',
            gst_number: '27AADCA1234F1ZH',
            hosting_provider: 'Hostinger',
            plan_id: customPlan?.id,
        },
    });

    const client2 = await prisma.client.create({
        data: {
            name: 'Deepika Nair',
            email: 'deepika@nairjewellers.com',
            company: 'Nair Jewellers',
            phone: '+91-9845123456',
            domain: 'nairjewellers.com',
            gst_number: '32AADCN5678G1ZP',
            hosting_provider: 'AWS',
            plan_id: ecommPlan?.id,
        },
    });

    const client3 = await prisma.client.create({
        data: {
            name: 'Suresh Patil',
            email: 'suresh@patilpharmacy.in',
            company: 'Patil Pharmacy Chain',
            phone: '+91-9823456789',
            domain: 'patilpharmacy.in',
            gst_number: '29AADCP9012H1ZQ',
            hosting_provider: 'DigitalOcean',
            plan_id: starterPlan?.id,
        },
    });
    console.log('✅ Clients created with service plans');

    const pmUser = await prisma.user.findUnique({ where: { email: 'pm@gwfcrm.com' } });
    const devUser = await prisma.user.findUnique({ where: { email: 'dev@gwfcrm.com' } });

    // Create Projects
    const project1 = await prisma.project.create({
        data: {
            client_id: client1.id,
            title: 'Agarwal Exports — CRM & Dashboard',
            description: 'Custom web application with order management, CRM dashboard, and shipment tracking for export business',
            start_date: new Date('2026-01-10'),
            end_date: new Date('2026-04-30'),
            status: 'DEVELOPMENT',
            budget: 99999,
        },
    });

    const project2 = await prisma.project.create({
        data: {
            client_id: client2.id,
            title: 'Nair Jewellers — E-Commerce Store',
            description: 'Online jewellery store with product catalog, Razorpay integration, and admin inventory management',
            start_date: new Date('2026-02-01'),
            end_date: new Date('2026-05-15'),
            status: 'DESIGN',
            budget: 49999,
        },
    });

    const project3 = await prisma.project.create({
        data: {
            client_id: client3.id,
            title: 'Patil Pharmacy — Business Website',
            description: 'Professional multi-location pharmacy website with store locator, product info, and prescription upload',
            start_date: new Date('2026-02-10'),
            end_date: new Date('2026-03-30'),
            status: 'DEVELOPMENT',
            budget: 24999,
        },
    });
    console.log('✅ Projects created');

    // Create tasks for Project 1 (Agarwal Exports — CRM)
    const tasksP1 = [
        { project_id: project1.id, title: 'UI/UX wireframes and prototyping', assigned_user_id: devUser?.id, priority: 'HIGH', status: 'DONE', due_date: new Date('2026-02-01') },
        { project_id: project1.id, title: 'Database schema design', assigned_user_id: devUser?.id, priority: 'HIGH', status: 'DONE', due_date: new Date('2026-02-10') },
        { project_id: project1.id, title: 'Backend API — Orders module', assigned_user_id: devUser?.id, priority: 'HIGH', status: 'IN_PROGRESS', due_date: new Date('2026-03-01') },
        { project_id: project1.id, title: 'Frontend — Dashboard & reports', assigned_user_id: devUser?.id, priority: 'MEDIUM', status: 'IN_PROGRESS', due_date: new Date('2026-03-15') },
        { project_id: project1.id, title: 'Shipment tracking integration', assigned_user_id: devUser?.id, priority: 'MEDIUM', status: 'TODO', due_date: new Date('2026-04-01') },
        { project_id: project1.id, title: 'QA testing & client review', assigned_user_id: pmUser?.id, priority: 'HIGH', status: 'TODO', due_date: new Date('2026-04-15') },
    ];

    // Tasks for Project 2 (Nair Jewellers — E-Commerce)
    const tasksP2 = [
        { project_id: project2.id, title: 'Product photography guidelines', assigned_user_id: pmUser?.id, priority: 'HIGH', status: 'DONE', due_date: new Date('2026-02-15') },
        { project_id: project2.id, title: 'Design homepage & product pages', assigned_user_id: devUser?.id, priority: 'HIGH', status: 'IN_PROGRESS', due_date: new Date('2026-03-01') },
        { project_id: project2.id, title: 'Razorpay payment gateway integration', assigned_user_id: devUser?.id, priority: 'HIGH', status: 'TODO', due_date: new Date('2026-03-20') },
        { project_id: project2.id, title: 'Inventory management admin panel', assigned_user_id: devUser?.id, priority: 'MEDIUM', status: 'TODO', due_date: new Date('2026-04-10') },
    ];

    // Tasks for Project 3 (Patil Pharmacy)
    const tasksP3 = [
        { project_id: project3.id, title: 'Content gathering from client', assigned_user_id: pmUser?.id, priority: 'HIGH', status: 'DONE', due_date: new Date('2026-02-15') },
        { project_id: project3.id, title: 'Homepage & about page design', assigned_user_id: devUser?.id, priority: 'HIGH', status: 'IN_PROGRESS', due_date: new Date('2026-02-28') },
        { project_id: project3.id, title: 'Store locator with Google Maps', assigned_user_id: devUser?.id, priority: 'MEDIUM', status: 'TODO', due_date: new Date('2026-03-10') },
        { project_id: project3.id, title: 'Prescription upload feature', assigned_user_id: devUser?.id, priority: 'LOW', status: 'TODO', due_date: new Date('2026-03-20') },
    ];

    for (const t of [...tasksP1, ...tasksP2, ...tasksP3]) {
        await prisma.task.create({ data: t });
    }
    console.log('✅ Tasks created across all projects');

    // Create checklists for projects (realistic progress)
    const defaultChecklist = [
        'Requirements & Scope Finalized',
        'UI/UX Design & Wireframes',
        'Design Approved by Client',
        'Framework & Tech Stack Setup',
        'Homepage Development',
        'Inner Pages Development',
        'Content Integration',
        'Contact Forms & CTAs',
        'Mobile Responsiveness',
        'SEO Setup & Meta Tags',
        'Domain & Hosting Configuration',
        'SSL Certificate Setup',
        'Testing & QA',
        'Client Review & Feedback',
        'Go Live & Deployment',
    ];

    // Project 1: Agarwal Exports — 40% done (6 of 15)
    for (let i = 0; i < defaultChecklist.length; i++) {
        await prisma.projectChecklist.create({
            data: {
                project_id: project1.id,
                label: defaultChecklist[i],
                sort_order: i,
                is_completed: i < 6, // first 6 done
                completed_at: i < 6 ? new Date('2026-02-15') : null,
            },
        });
    }

    // Project 2: Nair Jewellers — 20% done (3 of 15)
    for (let i = 0; i < defaultChecklist.length; i++) {
        await prisma.projectChecklist.create({
            data: {
                project_id: project2.id,
                label: defaultChecklist[i],
                sort_order: i,
                is_completed: i < 3,
                completed_at: i < 3 ? new Date('2026-02-20') : null,
            },
        });
    }

    // Project 3: Patil Pharmacy — 33% done (5 of 15)
    for (let i = 0; i < defaultChecklist.length; i++) {
        await prisma.projectChecklist.create({
            data: {
                project_id: project3.id,
                label: defaultChecklist[i],
                sort_order: i,
                is_completed: i < 5,
                completed_at: i < 5 ? new Date('2026-02-18') : null,
            },
        });
    }
    console.log('✅ Project checklists created with progress');

    // Create invoices
    const billingUser = await prisma.user.findUnique({ where: { email: 'billing@gwfcrm.com' } });

    const invoice1 = await prisma.invoice.create({
        data: {
            invoice_number: 'INV-0001',
            client_id: client1.id,
            project_id: project1.id,
            due_date: new Date('2026-02-28'),
            total_amount: 50000,
            amount_paid: 50000,
            status: 'PAID',
            notes: 'Phase 1 — Design & wireframes milestone',
            items: {
                create: [
                    { description: 'UI/UX Design & Wireframing', quantity: 1, unit_price: 30000 },
                    { description: 'Database Architecture Design', quantity: 1, unit_price: 20000 },
                ],
            },
        },
    });

    const invoice2 = await prisma.invoice.create({
        data: {
            invoice_number: 'INV-0002',
            client_id: client1.id,
            project_id: project1.id,
            due_date: new Date('2026-03-31'),
            total_amount: 49999,
            amount_paid: 25000,
            status: 'PARTIAL',
            notes: 'Phase 2 — Development milestone',
            items: {
                create: [
                    { description: 'Backend API Development', quantity: 1, unit_price: 25000 },
                    { description: 'Frontend Dashboard Development', quantity: 1, unit_price: 24999 },
                ],
            },
        },
    });

    const invoice3 = await prisma.invoice.create({
        data: {
            invoice_number: 'INV-0003',
            client_id: client2.id,
            project_id: project2.id,
            due_date: new Date('2026-03-15'),
            total_amount: 25000,
            amount_paid: 25000,
            status: 'PAID',
            notes: 'E-Commerce design phase advance',
            items: {
                create: [
                    { description: 'E-Commerce Store Design', quantity: 1, unit_price: 15000 },
                    { description: 'Product Catalog Setup', quantity: 1, unit_price: 10000 },
                ],
            },
        },
    });

    const invoice4 = await prisma.invoice.create({
        data: {
            invoice_number: 'INV-0004',
            client_id: client3.id,
            project_id: project3.id,
            due_date: new Date('2026-03-30'),
            total_amount: 24999,
            amount_paid: 12000,
            status: 'PARTIAL',
            notes: 'Business website full build',
            items: {
                create: [
                    { description: 'Website Design (5 pages)', quantity: 1, unit_price: 12000 },
                    { description: 'SEO Setup & Content', quantity: 1, unit_price: 7999 },
                    { description: 'Store Locator Feature', quantity: 1, unit_price: 5000 },
                ],
            },
        },
    });
    console.log('✅ Invoices created');

    // Record payments
    await prisma.payment.create({ data: { invoice_id: invoice1.id, amount: 30000, method: 'BANK', notes: 'Advance payment — NEFT', date: new Date('2026-01-15') } });
    await prisma.payment.create({ data: { invoice_id: invoice1.id, amount: 20000, method: 'BANK', notes: 'Design milestone completed — NEFT', date: new Date('2026-02-20') } });
    await prisma.payment.create({ data: { invoice_id: invoice2.id, amount: 25000, method: 'BANK', notes: 'Development phase advance — NEFT', date: new Date('2026-03-01') } });
    await prisma.payment.create({ data: { invoice_id: invoice3.id, amount: 25000, method: 'CARD', notes: 'Full design advance — Credit Card', date: new Date('2026-02-05') } });
    await prisma.payment.create({ data: { invoice_id: invoice4.id, amount: 12000, method: 'BANK', notes: 'Initial deposit — UPI', date: new Date('2026-02-12') } });
    console.log('✅ Payments recorded');

    // Create coupons
    await prisma.coupon.create({ data: { code: 'WELCOME15', discount_percent: 15, valid_until: new Date('2026-12-31'), is_active: true } });
    await prisma.coupon.create({ data: { code: 'DIWALI25', discount_percent: 25, valid_until: new Date('2026-11-15'), is_active: true } });
    console.log('✅ Coupons created');

    console.log('\n🎉 Seed completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('  Admin: admin@gwfcrm.com / admin123');
    console.log('  Sales: sales@gwfcrm.com / password123');
    console.log('  PM: pm@gwfcrm.com / password123');
    console.log('  Dev: dev@gwfcrm.com / password123');
    console.log('  Billing: billing@gwfcrm.com / password123');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
