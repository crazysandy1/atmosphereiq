
// Recommend Zone Flow
'use server';
/**
 * @fileOverview An AI agent that recommends zones in Bengaluru for residential, commercial, and industrial purposes based on air quality data.
 *
 * - recommendZone - A function that handles the zone recommendation process.
 * - RecommendZoneInput - The input type for the recommendZone function.
 * - RecommendZoneOutput - The return type for the recommendZone function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecommendZoneInputSchema = z.object({
  airQualityData: z.string().describe('Air quality data for various locations in Bengaluru, including parameters like AQI, PM2.5, PM10, etc.'),
});
export type RecommendZoneInput = z.infer<typeof RecommendZoneInputSchema>;

const RecommendZoneOutputSchema = z.object({
  residentialZones: z.array(z.string()).describe('List of zones recommended for residential purposes.'),
  commercialZones: z.array(z.string()).describe('List of zones recommended for commercial purposes.'),
  industrialZones: z.array(z.string()).describe('List of zones recommended for industrial purposes.'),
  message: z.string().optional().describe('An optional message from the AI.')
});
export type RecommendZoneOutput = z.infer<typeof RecommendZoneOutputSchema>;

export async function recommendZone(input: RecommendZoneInput): Promise<RecommendZoneOutput> {
  return recommendZoneFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendZonePrompt',
  input: {schema: RecommendZoneInputSchema},
  output: {schema: RecommendZoneOutputSchema},
  prompt: `You are an expert urban planner specializing in recommending zones for different purposes based on air quality data in Bengaluru.

  Analyze the provided air quality data to identify suitable zones for residential, commercial, and industrial purposes.
  Consider multiple air quality parameters, including AQI, PM2.5, PM10, and other relevant factors.

  Air Quality Data: {{{airQualityData}}}

  Based on your analysis, provide the zones best suited for each purpose.
  `,
});

const recommendZoneFlow = ai.defineFlow(
  {
    name: 'recommendZoneFlow',
    inputSchema: RecommendZoneInputSchema,
    outputSchema: RecommendZoneOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
     return {
      residentialZones: output?.residentialZones || [],
      commercialZones: output?.commercialZones || [],
      industrialZones: output?.industrialZones || [],
      message: output?.message
    };
  }
);

