
'use server';
/**
 * @fileOverview An AI agent that provides personalized area recommendations in Bengaluru
 * based on user preferences like purpose of stay, duration, and health concerns.
 *
 * - getPersonalizedRecommendationsFlow - A function that handles the personalized recommendation process.
 * - PersonalizedRecInputSchema - The input type for the flow.
 * - PersonalizedRecOutputSchema - The return type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit'; // Corrected import for zod

const PersonalizedRecInputSchema = z.object({
  purpose: z.enum(['residential', 'commercial', 'industrial']).describe('The primary purpose for finding a location (e.g., House/Flat, Commercial, Industrial).'),
  lengthOfStay: z.string().describe('Expected duration of stay in Bengaluru (e.g., "<1 Year", "1-3 Years", "5+ Years", "Permanent").'),
  healthConcerns: z.array(z.string()).describe('List of health concerns, if any (e.g., ["Respiratory Issues", "Allergies"], or ["None"]).'),
});
export type PersonalizedRecInput = z.infer<typeof PersonalizedRecInputSchema>;

const PersonalizedRecOutputSchema = z.object({
  prioritizedAreas: z.array(
    z.object({
      name: z.string().describe("Name of a recommended area in Bengaluru. This should be a known area of Bengaluru."),
      reasoning: z.string().describe("Why this area is a good fit based on the user's preferences and general knowledge about Bengaluru zones and typical air quality patterns. Explain how it relates to their purpose, stay duration, and health concerns."),
    })
  ).describe("A list of 2-3 prioritized areas that best fit the user's criteria. If no specific areas can be definitively recommended, this array can be empty."),
  additionalAdvice: z.string().optional().describe("General advice for the user based on their inputs, e.g., importance of checking daily AQI for suggested areas using the search feature, types of housing to look for, specific considerations for their health concerns, etc."),
});
export type PersonalizedRecOutput = z.infer<typeof PersonalizedRecOutputSchema>;


export async function getPersonalizedRecommendations(input: PersonalizedRecInput): Promise<PersonalizedRecOutput> {
  return getPersonalizedRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizedRecommendationPrompt',
  input: {schema: PersonalizedRecInputSchema},
  output: {schema: PersonalizedRecOutputSchema},
  prompt: `You are an expert advisor for individuals and businesses looking to find suitable locations in Bengaluru, India.
Your advice should be based on their specific needs regarding purpose, duration of stay, and health concerns.
You do not have live air quality data for all locations, so base your area recommendations on general knowledge of Bengaluru's zones (e.g., tech parks, residential layouts, industrial areas), typical urban environmental factors, and accessibility.
Strongly encourage the user to use the app's search feature to check live air quality data for any area they are considering.

User Preferences:
- Purpose of Stay: {{{purpose}}}
- Expected Duration: {{{lengthOfStay}}}
- Health Concerns: {{#if healthConcerns.length}} {{{healthConcerns}}} {{else}} None specified {{/if}}

Based on these preferences:
1. Recommend 2-3 distinct areas in Bengaluru that would generally be a good starting point for their search.
   - For each area, provide a clear 'name' (e.g., "Koramangala", "Whitefield", "Peenya Industrial Area").
   - Provide specific 'reasoning' why that area aligns with their purpose, duration, and health considerations.
2. Offer 'additionalAdvice' that is practical and helpful, considering their inputs. For example, if they have health concerns, advise on checking daily AQI and proximity to green spaces or healthcare. If commercial, mention infrastructure. If industrial, discuss zoning.

Output the response in the specified JSON format. If you cannot make specific area recommendations based on the input, leave 'prioritizedAreas' as an empty array and explain why in 'additionalAdvice'.
`,
});

const getPersonalizedRecommendationsFlow = ai.defineFlow(
  {
    name: 'getPersonalizedRecommendationsFlow',
    inputSchema: PersonalizedRecInputSchema,
    outputSchema: PersonalizedRecOutputSchema,
  },
  async (input) => {
    // Add a check for "None" in healthConcerns and convert to empty array if it's the only item
    const processedInput = {
      ...input,
      healthConcerns: (input.healthConcerns.length === 1 && input.healthConcerns[0].toLowerCase() === 'none') ? [] : input.healthConcerns,
    };

    const {output} = await prompt(processedInput);
    if (!output) {
        return {
            prioritizedAreas: [],
            additionalAdvice: "Sorry, I wasn't able to generate personalized advice at this time. Please try again or rephrase your needs.",
        };
    }
    return {
        prioritizedAreas: output.prioritizedAreas || [],
        additionalAdvice: output.additionalAdvice,
    };
  }
);
