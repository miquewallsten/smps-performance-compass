import { Position, EvalSection } from '@/types';

/**
 * Peso GLOBAL de cada sección por posición (suma 100%).
 * Fuente: hoja "Criterio técnico + Competencias" del archivo "Criterio Juridico - SDC.xlsx".
 *
 * Legal:
 *   Socio / Salary Partner / Counsel:  Técnico 60%, Competencias 20%, Blandas 20%
 *   Asociado Sr / Mid:                 Técnico 60%, Competencias 20%, Blandas 20%
 *   Asociado Jr / Pasante / Pct:       Técnico 40%, Competencias 40%, Blandas 20%
 *
 * Administrativo:
 *   Dirección / Gerente / Coord / Analista:  Competencias 40%, Técnico 40%, Blandas 20%
 *   Asistente / Soporte / Archivista:        Competencias 50%, Técnico 30%, Blandas 20%
 */
export type SectionWeights = Record<EvalSection, number>;

export const SECTION_WEIGHTS: Record<Position, SectionWeights> = {
  // Legal — senior positions: technical criteria dominates
  socio:                { competencias: 20, tecnico: 60, blandas: 20 },
  salary_partner:       { competencias: 20, tecnico: 60, blandas: 20 },
  counsel:              { competencias: 20, tecnico: 60, blandas: 20 },

  asociado_sr:          { competencias: 20, tecnico: 60, blandas: 20 },
  asociado_mid:         { competencias: 20, tecnico: 60, blandas: 20 },
  asociado_jr:          { competencias: 40, tecnico: 40, blandas: 20 },
  pasante_carrera:      { competencias: 40, tecnico: 40, blandas: 20 },
  pasante:              { competencias: 40, tecnico: 40, blandas: 20 },

  // Administrativo
  director:             { competencias: 40, tecnico: 40, blandas: 20 },
  gerente:              { competencias: 40, tecnico: 40, blandas: 20 },
  coordinador:          { competencias: 40, tecnico: 40, blandas: 20 },
  analista:             { competencias: 40, tecnico: 40, blandas: 20 },
  asistente:            { competencias: 50, tecnico: 30, blandas: 20 },
  soporte:              { competencias: 50, tecnico: 30, blandas: 20 },
  archivista:           { competencias: 50, tecnico: 30, blandas: 20 },
  dummy:                { competencias: 40, tecnico: 40, blandas: 20 },
};

export function getSectionWeights(position: Position): SectionWeights {
  return SECTION_WEIGHTS[position] ?? { competencias: 40, tecnico: 40, blandas: 20 };
}
