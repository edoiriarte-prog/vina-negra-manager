
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
    .describe('A string containing key financial metrics and inventory data.'),
  userPrompt: z
    .string()
    .describe('The specific question or topic the user wants the AI to analyze.'),
});
export type GenerateFinancialSummaryInput = z.infer<typeof GenerateFinancialSummaryInputSchema>;

const GenerateFinancialSummaryOutputSchema = z.object({
  summary: z.string().describe('The detailed analysis and response based on the provided data and user prompt.'),
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
  prompt: `Eres un experto analista de negocios y finanzas para una empresa agroindustrial.
  
  Tu tarea es analizar los datos proporcionados y responder a la consulta específica del usuario de manera clara, concisa y profesional. Usa un tono ejecutivo.

  DATOS DISPONIBLES:
  {{{financialData}}}

  CONSULTA DEL USUARIO:
  "{{{userPrompt}}}"

  Basándote en los datos y la consulta, genera una respuesta que aborde directamente la pregunta del usuario.
  Si la pregunta es sobre precios, sugiere un precio de venta. Si es sobre stock, detalla el inventario. Si es una pregunta abierta, provee un resumen ejecutivo.
  Usa viñetas o listas para estructurar tu respuesta si es apropiado.
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
