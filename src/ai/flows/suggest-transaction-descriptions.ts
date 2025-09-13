'use server';

/**
 * @fileOverview AI agent that suggests descriptions for financial transactions.
 *
 * - suggestTransactionDescription - A function that suggests descriptions for financial transactions.
 * - SuggestTransactionDescriptionInput - The input type for the suggestTransactionDescription function.
 * - SuggestTransactionDescriptionOutput - The return type for the suggestTransactionDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTransactionDescriptionInputSchema = z.object({
  transactionType: z
    .string()
    .describe('The type of transaction (e.g., income, expense).'),
  transactionDetails: z
    .string()
    .describe('Details about the transaction, such as the amount and involved parties.'),
});
export type SuggestTransactionDescriptionInput = z.infer<
  typeof SuggestTransactionDescriptionInputSchema
>;

const SuggestTransactionDescriptionOutputSchema = z.object({
  suggestedDescription: z
    .string()
    .describe('A suggested description for the financial transaction.'),
});
export type SuggestTransactionDescriptionOutput = z.infer<
  typeof SuggestTransactionDescriptionOutputSchema
>;

export async function suggestTransactionDescription(
  input: SuggestTransactionDescriptionInput
): Promise<SuggestTransactionDescriptionOutput> {
  return suggestTransactionDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTransactionDescriptionPrompt',
  input: {schema: SuggestTransactionDescriptionInputSchema},
  output: {schema: SuggestTransactionDescriptionOutputSchema},
  prompt: `You are a financial expert. Suggest a concise and descriptive description for a financial transaction.

Transaction Type: {{{transactionType}}}
Transaction Details: {{{transactionDetails}}}

Suggested Description:`,
});

const suggestTransactionDescriptionFlow = ai.defineFlow(
  {
    name: 'suggestTransactionDescriptionFlow',
    inputSchema: SuggestTransactionDescriptionInputSchema,
    outputSchema: SuggestTransactionDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
