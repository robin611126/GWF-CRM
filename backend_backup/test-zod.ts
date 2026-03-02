import { createLeadSchema } from './src/modules/leads/lead.schema';

const testPayload1 = { name: "Test Lead" };
const testPayload2 = { name: "Test Lead", email: "" };

console.log("Test 1 (undefined email):");
try {
    createLeadSchema.parse({ body: testPayload1 });
    console.log("Success");
} catch (e) {
    console.log(e.errors);
}

console.log("\nTest 2 (empty string email):");
try {
    createLeadSchema.parse({ body: testPayload2 });
    console.log("Success");
} catch (e) {
    console.log(e.errors);
}
