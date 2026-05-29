/**
 * Intent detection — determines if a user message needs tool calls.
 * Smart, not brittle: assumes tools are needed unless the message is
 * clearly just a greeting with no substantive content.
 */
export function needsTools(message: string, hasFile: boolean): boolean {
  if (hasFile) return true;
  const lower = message.toLowerCase().trim();

  // Pure greetings with no question — no tools needed
  const greetingOnly = /^(hola|buenos?\s*d[ií]as?|buenas?\s*tardes?|buenas?\s*noches?|gracias?|ok|vale|entiendo|sip|si|no|correcto|perfecto|genial|excelente|c[oó]mo\s+est[aá]s|qu[eé]\s*tal|hey|saludos|bye|adi[oó]s|hasta\s+luego)\s*[!?.]*$/i;
  if (greetingOnly.test(lower)) return false;

  // If it's more than a greeting, assume tools are needed — the LLM can decide
  return true;
}
