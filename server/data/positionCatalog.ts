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

export const POSITION_CATALOG: SeedPosition[] = [
  // Legal - Fiscal Consultoría
  { cve: 'SMPS01', label: 'Socio Consultoría Fiscal', basePosition: 'socio', workAreaId: 'fiscal_consultoria' },
  { cve: 'SMPS04', label: 'Salary Partner Consultoría Fiscal', basePosition: 'salary_partner', workAreaId: 'fiscal_consultoria' },
  { cve: 'SMPS07', label: 'Counsel Consultoría Fiscal', basePosition: 'counsel', workAreaId: 'fiscal_consultoria' },
  { cve: 'SMPS10', label: 'Asociado Sr Consultoría Fiscal', basePosition: 'asociado_sr', workAreaId: 'fiscal_consultoria' },
  { cve: 'SMPS13', label: 'Asociado Mid Consultoría Fiscal', basePosition: 'asociado_mid', workAreaId: 'fiscal_consultoria' },
  { cve: 'SMPS16', label: 'Asociado Jr Consultoría Fiscal', basePosition: 'asociado_jr', workAreaId: 'fiscal_consultoria' },
  { cve: 'SMPS19', label: 'Pasante con Carrera Terminada Consultoría Fiscal', basePosition: 'pasante_carrera', workAreaId: 'fiscal_consultoria' },
  { cve: 'SMPS22', label: 'Pasante Consultoría Fiscal', basePosition: 'pasante', workAreaId: 'fiscal_consultoria' },

  // Legal - Fiscal Litigio
  { cve: 'SMPS02', label: 'Socio Litigio Fiscal', basePosition: 'socio', workAreaId: 'fiscal_litigio' },
  { cve: 'SMPS05', label: 'Salary Partner Litigio Fiscal', basePosition: 'salary_partner', workAreaId: 'fiscal_litigio' },
  { cve: 'SMPS08', label: 'Counsel Litigio Fiscal', basePosition: 'counsel', workAreaId: 'fiscal_litigio' },
  { cve: 'SMPS11', label: 'Asociado Sr Litigio Fiscal', basePosition: 'asociado_sr', workAreaId: 'fiscal_litigio' },
  { cve: 'SMPS14', label: 'Asociado Mid Litigio Fiscal', basePosition: 'asociado_mid', workAreaId: 'fiscal_litigio' },
  { cve: 'SMPS17', label: 'Asociado Jr Litigio Fiscal', basePosition: 'asociado_jr', workAreaId: 'fiscal_litigio' },
  { cve: 'SMPS20', label: 'Pasante con Carrera Terminada Litigio Fiscal', basePosition: 'pasante_carrera', workAreaId: 'fiscal_litigio' },
  { cve: 'SMPS23', label: 'Pasante Litigio Fiscal', basePosition: 'pasante', workAreaId: 'fiscal_litigio' },

  // Legal - Corporativo
  { cve: 'SMPS03', label: 'Socio Corporativo', basePosition: 'socio', workAreaId: 'corporativo' },
  { cve: 'SMPS06', label: 'Salary Partner Corporativo', basePosition: 'salary_partner', workAreaId: 'corporativo' },
  { cve: 'SMPS09', label: 'Counsel Corporativo', basePosition: 'counsel', workAreaId: 'corporativo' },
  { cve: 'SMPS12', label: 'Asociado Sr Corporativo', basePosition: 'asociado_sr', workAreaId: 'corporativo' },
  { cve: 'SMPS15', label: 'Asociado Mid Corporativo', basePosition: 'asociado_mid', workAreaId: 'corporativo' },
  { cve: 'SMPS18', label: 'Asociado Jr Corporativo', basePosition: 'asociado_jr', workAreaId: 'corporativo' },
  { cve: 'SMPS21', label: 'Pasante con Carrera Terminada Corporativo', basePosition: 'pasante_carrera', workAreaId: 'corporativo' },
  { cve: 'SMPS24', label: 'Pasante Corporativo', basePosition: 'pasante', workAreaId: 'corporativo' },

  // Administrativo - Backoffice
  { cve: 'SMPS25', label: 'Director de Marketing y BD', basePosition: 'director', workAreaId: 'backoffice' },
  { cve: 'SMPS26', label: 'Directora de Admón y Finanzas', basePosition: 'director', workAreaId: 'backoffice' },
  { cve: 'SMPS27', label: 'Directora de Recursos Humanos', basePosition: 'director', workAreaId: 'backoffice' },
  { cve: 'SMPS28', label: 'Coord. Cobranza', basePosition: 'coordinador', workAreaId: 'backoffice' },
  { cve: 'SMPS29', label: 'Coord. Servicios Generales', basePosition: 'coordinador', workAreaId: 'backoffice' },
  { cve: 'SMPS30', label: 'Coordinador de BD', basePosition: 'coordinador', workAreaId: 'backoffice' },
  { cve: 'SMPS31', label: 'Coordinador de Marketing', basePosition: 'coordinador', workAreaId: 'backoffice' },
  { cve: 'SMPS32', label: 'Coordinadora de R.H.', basePosition: 'coordinador', workAreaId: 'backoffice' },
  { cve: 'SMPS33', label: 'Gte. Facturación y Cobranza', basePosition: 'gerente', workAreaId: 'backoffice' },
  { cve: 'SMPS34', label: 'Analista Sistemas', basePosition: 'analista', workAreaId: 'backoffice' },
  { cve: 'SMPS35', label: 'Soporte Sistemas', basePosition: 'soporte', workAreaId: 'backoffice' },
  { cve: 'SMPS36', label: 'Archivista', basePosition: 'archivista', workAreaId: 'backoffice' },
  { cve: 'SMPS37', label: 'Asistente Consultoría Fiscal', basePosition: 'asistente', workAreaId: 'backoffice' },
  { cve: 'SMPS38', label: 'Asistente Corporativo', basePosition: 'asistente', workAreaId: 'backoffice' },
];
