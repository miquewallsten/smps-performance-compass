export interface SeedWorkArea {
  id: string;
  label: string;
  level: 'legal' | 'administrativo';
  sortOrder: number;
}

export const WORK_AREAS: SeedWorkArea[] = [
  { id: 'corporativo', label: 'Corporativo', level: 'legal', sortOrder: 1 },
  { id: 'consultoria_fiscal', label: 'Consultoría Fiscal', level: 'legal', sortOrder: 2 },
  { id: 'litigio_fiscal', label: 'Litigio Fiscal', level: 'legal', sortOrder: 3 },
  { id: 'general', label: 'Legal (General)', level: 'legal', sortOrder: 4 },
  { id: 'administrativo', label: 'Administrativo', level: 'administrativo', sortOrder: 5 },
];

export interface SeedPosition {
  cve: string;
  label: string;
  basePosition: string;
  workAreaId: string;
}

export const POSITION_CATALOG: SeedPosition[] = [
  { cve: 'SMPS01', label: 'Socio Consultoría Fiscal', basePosition: 'socio', workAreaId: 'consultoria_fiscal' },
  { cve: 'SMPS02', label: 'Socio Litigio Fiscal', basePosition: 'socio', workAreaId: 'litigio_fiscal' },
  { cve: 'SMPS03', label: 'Socio Corporativo', basePosition: 'socio', workAreaId: 'corporativo' },
  { cve: 'SMPS04', label: 'Counsel', basePosition: 'counsel', workAreaId: 'general' },
  { cve: 'SMPS05', label: 'Asociado Sr Consultoría Fiscal', basePosition: 'asociado_sr', workAreaId: 'consultoria_fiscal' },
  { cve: 'SMPS06', label: 'Asociado Sr Litigio Fiscal', basePosition: 'asociado_sr', workAreaId: 'litigio_fiscal' },
  { cve: 'SMPS07', label: 'Asociado Sr Corporativo', basePosition: 'asociado_sr', workAreaId: 'corporativo' },
  { cve: 'SMPS08', label: 'Asociado Mid Consultoría Fiscal', basePosition: 'asociado_mid', workAreaId: 'consultoria_fiscal' },
  { cve: 'SMPS09', label: 'Asociado Mid Litigio Fiscal', basePosition: 'asociado_mid', workAreaId: 'litigio_fiscal' },
  { cve: 'SMPS10', label: 'Asociado Mid Corporativo', basePosition: 'asociado_mid', workAreaId: 'corporativo' },
  { cve: 'SMPS11', label: 'Asociado Jr Consultoría Fiscal', basePosition: 'asociado_jr', workAreaId: 'consultoria_fiscal' },
  { cve: 'SMPS12', label: 'Asociado Jr Corporativo', basePosition: 'asociado_jr', workAreaId: 'corporativo' },
  { cve: 'SMPS13', label: 'Pasante con Carrera Terminada Litigio Fiscal', basePosition: 'pasante_carrera', workAreaId: 'litigio_fiscal' },
  { cve: 'SMPS14', label: 'Pasante con Carrera Terminada Corporativo', basePosition: 'pasante_carrera', workAreaId: 'corporativo' },
  { cve: 'SMPS15', label: 'Pasante Corporativo', basePosition: 'pasante_corporativo', workAreaId: 'corporativo' },
  { cve: 'SMPS16', label: 'Director de Marketing y BD', basePosition: 'director', workAreaId: 'administrativo' },
  { cve: 'SMPS17', label: 'Directora de Admón y Finanzas', basePosition: 'director', workAreaId: 'administrativo' },
  { cve: 'SMPS18', label: 'Directora de Recursos Humanos', basePosition: 'director', workAreaId: 'administrativo' },
  { cve: 'SMPS19', label: 'Coord. Cobranza', basePosition: 'coordinador', workAreaId: 'administrativo' },
  { cve: 'SMPS20', label: 'Coord. Servicios Generales', basePosition: 'coordinador', workAreaId: 'administrativo' },
  { cve: 'SMPS21', label: 'Coordinador de BD', basePosition: 'coordinador', workAreaId: 'administrativo' },
  { cve: 'SMPS22', label: 'Coordinador de Marketing', basePosition: 'coordinador', workAreaId: 'administrativo' },
  { cve: 'SMPS23', label: 'Coordinadora de R.H.', basePosition: 'coordinador', workAreaId: 'administrativo' },
  { cve: 'SMPS24', label: 'Gte. Facturación y Cobranza', basePosition: 'gerente', workAreaId: 'administrativo' },
  { cve: 'SMPS25', label: 'Analista Sistemas', basePosition: 'analista', workAreaId: 'administrativo' },
  { cve: 'SMPS26', label: 'Soporte Sistemas', basePosition: 'archivo_soporte', workAreaId: 'administrativo' },
  { cve: 'SMPS27', label: 'Archivista', basePosition: 'archivo_soporte', workAreaId: 'administrativo' },
  { cve: 'SMPS28', label: 'Asistente Consultoría Fiscal', basePosition: 'asistente', workAreaId: 'administrativo' },
  { cve: 'SMPS29', label: 'Asistente Corporativo', basePosition: 'asistente', workAreaId: 'administrativo' },
];
