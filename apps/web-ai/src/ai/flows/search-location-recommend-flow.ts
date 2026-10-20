
'use server';
/**
 * @fileOverview An AI agent that analyzes provided air quality data for a specific location in Bengaluru
 * and recommends zones. It now also returns the source air quality data.
 *
 * - analyzeLocationDataAndRecommend - A function that handles the location-based zone recommendation process using provided data.
 * - AnalyzeLocationDataInput - The input type for the analyzeLocationDataAndRecommend function.
 * - SearchLocationRecommendOutput - The return type (shared with actions.ts).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Renamed input schema to reflect its new purpose
const AnalyzeLocationDataInputSchema = z.object({
  locationName: z.string().describe('The name of the location in Bengaluru, e.g., Koramangala, Whitefield.'),
  airQualityData: z.string().describe('The air quality data string for the specified location.'),
});
export type AnalyzeLocationDataInput = z.infer<typeof AnalyzeLocationDataInputSchema>;

// Output schema remains the same, but some fields will be populated by the calling action.
const SearchLocationRecommendOutputSchema = z.object({
  residentialZones: z.array(z.string()).describe('List of zones recommended for residential purposes.'),
  commercialZones: z.array(z.string()).describe('List of zones recommended for commercial purposes.'),
  industrialZones: z.array(z.string()).describe('List of zones recommended for industrial purposes.'),
  message: z.string().optional().describe('An optional message from the AI about its analysis.'),
  sourceAirQualityData: z.string().optional().describe("The raw air quality data string used for this recommendation."),
  searchedLocationName: z.string().optional().describe("The location name that was analyzed.")
});
export type SearchLocationRecommendOutput = z.infer<typeof SearchLocationRecommendOutputSchema>;


// The wrapper function now takes AnalyzeLocationDataInput
export async function analyzeLocationDataAndRecommend(input: AnalyzeLocationDataInput): Promise<SearchLocationRecommendOutput> {
  // The flow will only return analytical parts; `sourceAirQualityData` and `searchedLocationName`
  // will be added by the calling server action.
  const aiAnalysisResult = await analyzeLocationDataFlow(input);
  return {
    ...aiAnalysisResult,
    sourceAirQualityData: input.airQualityData, // Add back the source data
    searchedLocationName: input.locationName,   // Add back the searched location name
  };
}

const prompt = ai.definePrompt({
  name: 'analyzeLocationDataPrompt',
  input: {schema: AnalyzeLocationDataInputSchema},
  // The AI is now only responsible for zones and its direct message.
  output: {schema: z.object({
    residentialZones: z.array(z.string()).describe('List of zones recommended for residential purposes based on the provided data.'),
    commercialZones: z.array(z.string()).describe('List of zones recommended for commercial purposes based on the provided data.'),
    industrialZones: z.array(z.string()).describe('List of zones recommended for industrial purposes based on the provided data.'),
    message: z.string().optional().describe('An optional message from the AI about its analysis of the data for {{{locationName}}}.'),
  })},
  // No tool needed anymore, data is provided directly.
  prompt: `You are an expert urban planner.
You have been provided with air quality data for a specific location in Bengaluru: {{{locationName}}}.
The air quality data is: {{{airQualityData}}}

Analyze this 'airQualityData' to identify suitable zones for residential, commercial, and industrial purposes.
Consider multiple air quality parameters potentially present in the data.
Based on your analysis, provide the zones best suited for each purpose for '{{{locationName}}}'.
If the data seems insufficient or doesn't allow for clear recommendations, you can provide a message explaining this.
`,
});

const analyzeLocationDataFlow = ai.defineFlow(
  {
    name: 'analyzeLocationDataFlow',
    inputSchema: AnalyzeLocationDataInputSchema,
    // The flow's direct output is just the AI's analysis part.
    outputSchema: z.object({
        residentialZones: z.array(z.string()),
        commercialZones: z.array(z.string()),
        industrialZones: z.array(z.string()),
        message: z.string().optional(),
    }),
  },
  async (input) => {
    const {output} = await prompt(input);
    return {
      residentialZones: output?.residentialZones || [],
      commercialZones: output?.commercialZones || [],
      industrialZones: output?.industrialZones || [],
      message: output?.message,
    };
  }
);
