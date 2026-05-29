/**
 * File parsing helpers for the Copilot.
 * Handles CSV, XLSX, JSON, and plain text uploads.
 */
import * as XLSX from 'xlsx';

export function parseFile(buf: Buffer, name: string): string {
  const ext = name.toLowerCase().slice(name.lastIndexOf('.'));
  try {
    if (ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
      const wb = XLSX.read(buf, { type: 'buffer' });
      return wb.SheetNames.map(s => {
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[s], { defval: '' });
        return `Sheet:${s}(${rows.length}rows)\n${JSON.stringify(rows.slice(0, 30))}`;
      }).join('\n');
    }
    if (ext === '.json') return JSON.stringify(JSON.parse(buf.toString('utf-8')), null, 1);
    return buf.toString('utf-8');
  } catch (e) { return `[Error: ${e instanceof Error ? e.message : String(e)}]`; }
}

/**
 * Coerce tool call arguments from the LLM.
 * The LLM sometimes sends booleans and numbers as strings.
 */
export function coerceArgs(args: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const boolFields = new Set(['active', 'is_admin', 'is_super_user', 'is_managing_partner', 'enabled', 'hidden']);
  const numFields = new Set(['weight', 'default_weight', 'score']);
  for (const [k, v] of Object.entries(args)) {
    if (boolFields.has(k) && typeof v === 'string') {
      result[k] = v === 'true' || v === '1';
    } else if (numFields.has(k) && typeof v === 'string') {
      result[k] = parseFloat(v as string) || 0;
    } else {
      result[k] = v;
    }
  }
  return result;
}
