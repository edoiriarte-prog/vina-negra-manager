'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating an executive summary of the financial status.
 *
 * - generateFinancialSummary - A function that generates the financial summary.
 * - GenerateFinancialSummaryInput - The input type for the generateFinancialSummary function.
 * - GenerateFinancialSummaryOutput - The return type for the generateFinancialSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GenerateFinancialSummaryInputSchema = z.object({
  financialData: z
    .string()
    .describe('The financial data to summarize.  Include key metrics like revenue, expenses, and profit.'),
});
export type GenerateFinancialSummaryInput = z.infer<typeof GenerateFinancialSummaryInputSchema>;

const GenerateFinancialSummaryOutputSchema = z.object({
  summary: z.string().describe('The executive summary of the financial status.'),
  suggestedDescription: z
    .string()
    .describe('A suggested description for a financial transaction.'),
});
export type GenerateFinancialSummaryOutput = z.infer<typeof GenerateFinancialSummaryOutputSchema>;

export async function generateFinancialSummary(
  input: GenerateFinancialSummaryInput
): Promise<GenerateFinancialSummaryOutput> {
  return generateFinancialSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFinancialSummaryPrompt',
  input: {schema: GenerateFinancialSummaryInputSchema},
  output: {schema: GenerateFinancialSummaryOutputSchema},
  prompt: `You are an expert financial analyst.

  Generate an executive summary of the financial status based on the following data:
  {{financialData}}

  Also, suggest a description for a typical financial transaction based on this data.
  Make sure the summary is concise and easy to understand.
  `,
});

const generateFinancialSummaryFlow = ai.defineFlow(
  {
    name: 'generateFinancialSummaryFlow',
    inputSchema: GenerateFinancialSummaryInputSchema,
    outputSchema: GenerateFinancialSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
