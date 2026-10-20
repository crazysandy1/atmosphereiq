
import { config } from 'dotenv';
config();

import '@/ai/flows/recommend-zone.ts';
// Ensure this path still points to the refactored flow file if its name or export changed significantly for dev registration
import '@/ai/flows/search-location-recommend-flow.ts';
import '@/ai/flows/personalized-recommendation-flow.ts';

