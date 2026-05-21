export interface SeedPosition {
  cve: string;
  label: string;
  basePosition: string;
  practiceArea?: string;
  level: string;
}

export const POSITION_CATALOG: SeedPosition[] = [
  { cve: 'SMPS01', label: 'Socio Consultoría Fiscal', basePosition: 'socio', practiceArea: 'consultoria_fiscal', level: 'legal' },
  { cve: 'SMPS02', label: 'Socio Litigio Fiscal', basePosition: 'socio', practiceArea: 'litigio_fiscal', level: 'legal' },
  { cve: 'SMPS03', label: 'Socio Corporativo', basePosition: 'socio', practiceArea: 'corporativo', level: 'legal' },
  { cve: 'SMPS04', label: 'Counsel', basePosition: 'counsel', practiceArea: 'general', level: 'legal' },
  { cve: 'SMPS05', label: 'Asociado Sr Consultoría Fiscal', basePosition: 'asociado_sr', practiceArea: 'consultoria_fiscal', level: 'legal' },
  { cve: 'SMPS06', label: 'Asociado Sr Litigio Fiscal', basePosition: 'asociado_sr', practiceArea: 'litigio_fiscal', level: 'legal' },
  { cve: 'SMPS07', label: 'Asociado Sr Corporativo', basePosition: 'asociado_sr', practiceArea: 'corporativo', level: 'legal' },
  { cve: 'SMPS08', label: 'Asociado Mid Consultoría Fiscal', basePosition: 'asociado_mid', practiceArea: 'consultoria_fiscal', level: 'legal' },
  { cve: 'SMPS09', label: 'Asociado Mid Litigio Fiscal', basePosition: 'asociado_mid', practiceArea: 'litigio_fiscal', level: 'legal' },
  { cve: 'SMPS10', label: 'Asociado Mid Corporativo', basePosition: 'asociado_mid', practiceArea: 'corporativo', level: 'legal' },
  { cve: 'SMPS11', label: 'Asociado Jr Consultoría Fiscal', basePosition: 'asociado_jr', practiceArea: 'consultoria_fiscal', level: 'legal' },
  { cve: 'SMPS12', label: 'Asociado Jr Corporativo', basePosition: 'asociado_jr', practiceArea: 'corporativo', level: 'legal' },
  { cve: 'SMPS13', label: 'Pasante con Carrera Terminada Litigio Fiscal', basePosition: 'pasante_carrera', practiceArea: 'litigio_fiscal', level: 'legal' },
  { cve: 'SMPS14', label: 'Pasante con Carrera Terminada Corporativo', basePosition: 'pasante_carrera', practiceArea: 'corporativo', level: 'legal' },
  { cve: 'SMPS15', label: 'Pasante Corporativo', basePosition: 'pasante_corporativo', practiceArea: 'corporativo', level: 'legal' },
  { cve: 'SMPS16', label: 'Director de Marketing y BD', basePosition: 'director', level: 'administrativo' },
  { cve: 'SMPS17', label: 'Directora de Admón y Finanzas', basePosition: 'director', level: 'administrativo' },
  { cve: 'SMPS18', label: 'Directora de Recursos Humanos', basePosition: 'director', level: 'administrativo' },
  { cve: 'SMPS19', label: 'Coord. Cobranza', basePosition: 'coordinador', level: 'administrativo' },
  { cve: 'SMPS20', label: 'Coord. Servicios Generales', basePosition: 'coordinador', level: 'administrativo' },
  { cve: 'SMPS21', label: 'Coordinador de BD', basePosition: 'coordinador', level: 'administrativo' },
  { cve: 'SMPS22', label: 'Coordinador de Marketing', basePosition: 'coordinador', level: 'administrativo' },
  { cve: 'SMPS23', label: 'Coordinadora de R.H.', basePosition: 'coordinador', level: 'administrativo' },
  { cve: 'SMPS24', label: 'Gte. Facturación y Cobranza', basePosition: 'gerente', level: 'administrativo' },
  { cve: 'SMPS25', label: 'Analista Sistemas', basePosition: 'analista', level: 'administrativo' },
  { cve: 'SMPS26', label: 'Soporte Sistemas', basePosition: 'archivo_soporte', level: 'administrativo' },
  { cve: 'SMPS27', label: 'Archivista', basePosition: 'archivo_soporte', level: 'administrativo' },
  { cve: 'SMPS28', label: 'Asistente Consultoría Fiscal', basePosition: 'asistente', level: 'administrativo' },
  { cve: 'SMPS29', label: 'Asistente Corporativo', basePosition: 'asistente', level: 'administrativo' },
];
