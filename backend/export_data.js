// Export all data from SQLite dev.db to JSON files for InsForge migration
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const outDir = path.join(__dirname, 'migration_data');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const db = new Database(dbPath, { readonly: true });

// Get all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_prisma%' AND name NOT LIKE 'sqlite%'").all();

console.log('Tables found:', tables.map(t => t.name).join(', '));

for (const { name } of tables) {
    const rows = db.prepare(`SELECT * FROM "${name}"`).all();
    const outFile = path.join(outDir, `${name}.json`);
    fs.writeFileSync(outFile, JSON.stringify(rows, null, 2));
    console.log(`  ${name}: ${rows.length} records → ${outFile}`);
}

db.close();
console.log('\nExport complete! Files saved to:', outDir);
