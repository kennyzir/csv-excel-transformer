// ClawHub Local Skill - runs entirely in your agent, no API key required
// CSV / Excel Transformer - Parse, filter, transform, and merge CSV data

function parseCSV(csv: string, delimiter: string = ','): { headers: string[]; rows: Record<string, string>[] } {
  const lines = csv.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
  const rows = lines.slice(1).map(line => {
    const values = line.split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });
  return { headers, rows };
}

function filterRows(rows: Record<string, string>[], filters: Record<string, string>): Record<string, string>[] {
  return rows.filter(row => {
    for (const [key, val] of Object.entries(filters)) {
      if (!row[key] || !row[key].toLowerCase().includes(val.toLowerCase())) return false;
    }
    return true;
  });
}

function selectColumns(rows: Record<string, string>[], columns: string[]): Record<string, string>[] {
  return rows.map(row => {
    const selected: Record<string, string> = {};
    columns.forEach(c => { if (c in row) selected[c] = row[c]; });
    return selected;
  });
}

function sortRows(rows: Record<string, string>[], sortBy: string, order: string = 'asc'): Record<string, string>[] {
  return [...rows].sort((a, b) => {
    const va = a[sortBy] || '', vb = b[sortBy] || '';
    const na = parseFloat(va), nb = parseFloat(vb);
    if (!isNaN(na) && !isNaN(nb)) return order === 'desc' ? nb - na : na - nb;
    return order === 'desc' ? vb.localeCompare(va) : va.localeCompare(vb);
  });
}

function toCSV(rows: Record<string, string>[], headers?: string[]): string {
  if (rows.length === 0) return '';
  const h = headers || Object.keys(rows[0]);
  const lines = [h.join(','), ...rows.map(r => h.map(k => `"${(r[k] || '').replace(/"/g, '""')}"`).join(','))];
  return lines.join('\n');
}

export async function run(input: { csv: string; delimiter?: string; filters?: Record<string, string>; columns?: string[]; sort_by?: string; sort_order?: string; limit?: number }) {
  if (!input.csv || typeof input.csv !== 'string') throw new Error('csv is required (string)');
  if (input.csv.length > 10 * 1024 * 1024) throw new Error('CSV too large (max 10MB)');

  const startTime = Date.now();
  const parsed = parseCSV(input.csv, input.delimiter || ',');
  let result = parsed.rows;
  if (input.filters && typeof input.filters === 'object') result = filterRows(result, input.filters);
  if (input.columns && Array.isArray(input.columns)) result = selectColumns(result, input.columns);
  if (input.sort_by) result = sortRows(result, input.sort_by, input.sort_order || 'asc');
  if (input.limit && typeof input.limit === 'number') result = result.slice(0, input.limit);

  return {
    headers: input.columns || parsed.headers, rows: result, row_count: result.length,
    original_row_count: parsed.rows.length, output_csv: toCSV(result, input.columns || parsed.headers),
    _meta: { skill: 'csv-excel-transformer', latency_ms: Date.now() - startTime, input_size: input.csv.length },
  };
}

export default run;
