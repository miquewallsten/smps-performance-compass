export interface SeedWorkArea {
  id: string;
  label: string;
  level: 'legal' | 'administrativo';
  sortOrder: number;
}

export const WORK_AREAS: SeedWorkArea[] = [
  { id: 'fiscal_consultoria', label: 'Fiscal Consultoría', level: 'legal', sortOrder: 1 },
  { id: 'fiscal_litigio', label: 'Fiscal Litigio', level: 'legal', sortOrder: 2 },
  { id: 'corporativo', label: 'Corporativo', level: 'legal', sortOrder: 3 },
  { id: 'backoffice', label: 'Backoffice', level: 'administrativo', sortOrder: 4 },
  // Legacy aliases for backward compatibility
  { id: 'consultoria_fiscal', label: 'Fiscal Consultoría (legacy)', level: 'legal', sortOrder: 5 },
  { id: 'litigio_fiscal', label: 'Fiscal Litigio (legacy)', level: 'legal', sortOrder: 6 },
  { id: 'general', label: 'General (legacy)', level: 'legal', sortOrder: 7 },
];

export interface SeedPosition {
  cve: string;
  label: string;
  basePosition: string;
  workAreaId: string;
}

/**
 * SMPS position catalog — matches the original specification exactly.
 * CVE numbers SMPS01-SMPS29, no invented positions.
 */
export const POSITION_CATALOG: SeedPosition[] = [
  // Legal — Consultoría Fiscal
  { cve: 'SMPS01', label: 'Socio Consultoría Fiscal', basePosition: 'socio', workAreaId: 'fiscal_consultoria' },
  { cve: 'SMPS05', label: 'Asociado Sr Consultoría Fiscal', basePosition: 'asociado_sr', workAreaId: 'fiscal_consultoria' },
  { cve: 'SMPS08', label: 'Asociado Mid Consultoría Fiscal', basePosition: 'asociado_mid', workAreaId: 'fiscal_consultoria' },
  { cve: 'SMPS11', label: 'Asociado Jr Consultoría Fiscal', basePosition: 'asociado_jr', workAreaId: 'fiscal_consultoria' },
  { cve: 'SMPS14', label: 'Pasante con Carrera Terminada Corporativo', basePosition: 'pasante_carrera', workAreaId: 'fiscal_consultoria' },
  // Legal — Litigio Fiscal
  { cve: 'SMPS02', label: 'Socio Litigio Fiscal', basePosition: 'socio', workAreaId: 'fiscal_litigio' },
  { cve: 'SMPS06', label: 'Asociado Sr Litigio Fiscal', basePosition: 'asociado_sr', workAreaId: 'fiscal_litigio' },
  { cve: 'SMPS09', label: 'Asociado Mid Litigio Fiscal', basePosition: 'asociado_mid', workAreaId: 'fiscal_litigio' },
  { cve: 'SMPS12', label: 'Asociado Jr Corporativo', basePosition: 'asociado_jr', workAreaId: 'fiscal_litigio' },
  { cve: 'SMPS13', label: 'Pasante con Carrera Terminada Litigio Fiscal', basePosition: 'pasante_carrera', workAreaId: 'fiscal_litigio' },
  // Legal — Corporativo
  { cve: 'SMPS03', label: 'Socio Corporativo', basePosition: 'socio', workAreaId: 'corporativo' },
  { cve: 'SMPS04', label: 'Counsel', basePosition: 'counsel', workAreaId: 'corporativo' },
  { cve: 'SMPS07', label: 'Asociado Sr Corporativo', basePosition: 'asociado_sr', workAreaId: 'corporativo' },
  { cve: 'SMPS10', label: 'Asociado Mid Corporativo', basePosition: 'asociado_mid', workAreaId: 'corporativo' },
  { cve: 'SMPS15', label: 'Pasante Corporativo', basePosition: 'pasante_corporativo', workAreaId: 'corporativo' },
  // Administrativo — Backoffice
  { cve: 'SMPS16', label: 'Director de Marketing y BD', basePosition: 'director', workAreaId: 'backoffice' },
  { cve: 'SMPS17', label: 'Directora de Admón y Finanzas', basePosition: 'director', workAreaId: 'backoffice' },
  { cve: 'SMPS18', label: 'Directora de Recursos Humanos', basePosition: 'director', workAreaId: 'backoffice' },
  { cve: 'SMPS19', label: 'Coord. Cobranza', basePosition: 'coordinador', workAreaId: 'backoffice' },
  { cve: 'SMPS20', label: 'Coord. Servicios Generales', basePosition: 'coordinador', workAreaId: 'backoffice' },
  { cve: 'SMPS21', label: 'Coordinador de BD', basePosition: 'coordinador', workAreaId: 'backoffice' },
  { cve: 'SMPS22', label: 'Coordinador de Marketing', basePosition: 'coordinador', workAreaId: 'backoffice' },
  { cve: 'SMPS23', label: 'Coordinadora de R.H.', basePosition: 'coordinador', workAreaId: 'backoffice' },
  { cve: 'SMPS24', label: 'Gte. Facturación y Cobranza', basePosition: 'gerente', workAreaId: 'backoffice' },
  { cve: 'SMPS25', label: 'Analista Sistemas', basePosition: 'analista', workAreaId: 'backoffice' },
  { cve: 'SMPS26', label: 'Soporte Sistemas', basePosition: 'archivo_soporte', workAreaId: 'backoffice' },
  { cve: 'SMPS27', label: 'Archivista', basePosition: 'archivo_soporte', workAreaId: 'backoffice' },
  { cve: 'SMPS28', label: 'Asistente Consultoría Fiscal', basePosition: 'asistente', workAreaId: 'backoffice' },
  { cve: 'SMPS29', label: 'Asistente Corporativo', basePosition: 'asistente', workAreaId: 'backoffice' },
];

export const PRACTICE_GROUP_LABELS = {
  corporativo: 'Corporativo',
  fiscal_consultoria: 'Fiscal Consultoría',
  fiscal_litigio: 'Fiscal Litigio',
  administrativo: 'Administrativo',
  // Legacy aliases
  consultoria_fiscal: 'Fiscal Consultoría',
  litigio_fiscal: 'Fiscal Litigio',
  general: 'General',
  backoffice: 'Administrativo',
} as const;

export function asCustomPositions(): import('@/types').CustomPosition[] {
  return POSITION_CATALOG.map(p => ({
    id: p.cve,
    label: p.label,
    level: WORK_AREAS.find(w => w.id === p.workAreaId)?.level || 'administrativo',
    practiceArea: p.workAreaId as any,
    basePosition: p.basePosition as any,
    createdAt: '2026-01-01T00:00:00Z',
  }));
}

/**
 * Resolves the label for a position given its customPositionId and the catalog.
 */
export function resolvePositionLabel(
  customPositionId: string | undefined,
  catalog: import('@/types').CustomPosition[],
): string | null {
  if (!customPositionId) return null;
  const found = catalog.find(c => c.id === customPositionId);
  return found ? `${found.id} · ${found.label}` : null;
}
