# Export Architecture

## Current State

No CSV or Excel export functionality exists in the application.

## Requirements

1. **CSV Export** — for all tabular reports
2. **Excel Export** — for detailed analytics (future)
3. **Consistent column naming** — Spanish headers matching UI labels
4. **Audit logging** — record who exported what and when
5. **Role-aware filtering** — export only data the user can see
6. **Large dataset support** — stream for 1000+ rows

---

## Export Endpoints Design

### GET /api/analytics/export/evaluations

**Query params:** `period`, `format=csv|json`

**Columns:**
| Column Header | Source Field |
|---|---|
| Período | period |
| Evaluado | evaluated_name |
| Posición | evaluated_position |
| Área | evaluated_practice_area |
| Evaluador | evaluator_name |
| Tipo | eval_type |
| Calificación | total_score |
| Completado | completed_at |
| Feedback | feedback_completed |
| Respuestas | response_count |
| NA | na_count |

**Authorization:** Same role-based filtering as `/api/analytics/evaluations`

### GET /api/analytics/export/action-plans

**Query params:** `period`, `format=csv`

**Columns:** Período, Empleado, Posición, Supervisor, Estado, Contenido, Fecha Creación

### GET /api/analytics/export/objectives

**Query params:** `period`, `format=csv`

**Columns:** Período, Empleado, Posición, Objetivo, Estado, Fecha

### GET /api/analytics/export/vacations

**Query params:** `format=csv`

**Columns:** Empleado, Posición, Fecha Inicio, Fecha Fin, Días, Estado, Aprobado Por, Fecha Solicitud

---

## Implementation Approach

### CSV Generation

```typescript
function generateCSV(headers: string[], rows: any[][]): string {
  const escape = (v: any) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const headerLine = headers.map(escape).join(',');
  const dataLines = rows.map(row => row.map(escape).join(','));
  return [headerLine, ...dataLines].join('\n');
}
```

### Response Streaming

```typescript
res.setHeader('Content-Type', 'text/csv; charset=utf-8');
res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
// BOM for Excel UTF-8 compatibility
res.write('\uFEFF');
res.write(csvContent);
res.end();
```

### Audit Logging

```typescript
await auditLog({
  action: 'data_export',
  userId: req.user!.id,
  ipAddress: getClientIp(req),
  userAgent: getUserAgent(req),
  metadata: { format: 'csv', type: exportType, period, rowCount: rows.length }
});
```

---

## Excel Export (Future)

**Library:** `exceljs` (MIT license, no native dependencies)

**Features:**
- Multiple sheets per workbook
- Styling (header bold, conditional formatting)
- Column auto-width
- Number formatting for scores

**Priority:** Low. CSV is sufficient for current 14-user deployment.

---

## Performance Considerations

- CSV generation for <100 rows: <50ms (in-memory)
- CSV generation for 1000 rows: <500ms
- Use streaming for >5000 rows
- Maximum export size: 10,000 rows (hard limit)
- Rate limit: 10 exports per user per hour

---

## Security

- Exports require authentication
- Exports use same role-based filtering as the parent analytics endpoint
- Exports are audit-logged
- No export of sensitive columns (passwords, tokens, API keys)
- Export filenames include timestamp for uniqueness
