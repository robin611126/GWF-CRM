import { createClient } from '@insforge/sdk';

const INSFORGE_URL = import.meta.env.VITE_INSFORGE_URL || 'https://t39myz48.ap-southeast.insforge.app';
const INSFORGE_ANON_KEY = import.meta.env.VITE_INSFORGE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzOTI2Njl9.YxRyFT_AdOE8LBw7xH-iXtp59XzO17c9TBQG4ME-2_0';

export const insforge = createClient({
    baseUrl: INSFORGE_URL,
    anonKey: INSFORGE_ANON_KEY,
});

export { INSFORGE_URL, INSFORGE_ANON_KEY };
