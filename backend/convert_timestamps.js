// Convert epoch timestamps to ISO format in JSON files for InsForge import
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'migration_data');
const files = ['project_checklists.json', 'revision_history.json'];
const dateFields = ['created_at', 'updated_at', 'changed_at', 'completed_at', 'deleted_at', 'due_date', 'start_date', 'end_date', 'date', 'issued_date'];

for (const file of files) {
    const filePath = path.join(dir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    for (const row of data) {
        for (const field of dateFields) {
            if (row[field] !== undefined && row[field] !== null && typeof row[field] === 'number') {
                row[field] = new Date(row[field]).toISOString();
            }
        }
        // Convert SQLite booleans (0/1) to proper booleans
        if (row.is_completed !== undefined) row.is_completed = !!row.is_completed;
        if (row.is_active !== undefined) row.is_active = !!row.is_active;
        if (row.is_default !== undefined) row.is_default = !!row.is_default;
        if (row.frozen !== undefined) row.frozen = !!row.frozen;
    }

    const outPath = path.join(dir, file.replace('.json', '_converted.json'));
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
    console.log(`${file}: ${data.length} records converted → ${outPath}`);
}
