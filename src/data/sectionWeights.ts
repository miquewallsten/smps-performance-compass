import { Position, EvalSection } from '@/types';

/**
 * Peso GLOBAL de cada sección por posición (suma 100%).
 * Fuente: Distribución oficial de pesos por nivel de puesto (mayo 2025).
 *
 * Legal:
 *   Socio/Salary Partner: Competencias 60%, Técnico 20%, Blandas 20%
 *   Asociado Sr/Mid:      Competencias 60%, Técnico 20%, Blandas 20%
 *   Asociado Jr/Pasante:   Competencias 40%, Técnico 40%, Blandas 20%
 *
 * Administrativo:
 *   Dirección/Coord:       Competencias 40%, Técnico 40%, Blandas 20%
 *   Staff/Soporte:         Competencias 30%, Técnico 50%, Blandas 20%
 *
 * Counsel mantiene evaluación 100% técnico (sin cambios).
 */
export type SectionWeights = Record<EvalSection, number>;

export const SECTION_WEIGHTS: Record<Position, SectionWeights> = {
  // Legal
  socio:                { competencias: 60, tecnico: 20, blandas: 20 },
  salary_partner:       { competencias: 60, tecnico: 20, blandas: 20 },
  counsel:              { competencias: 0, tecnico: 100, blandas: 0 },

  asociado_sr:          { competencias: 60, tecnico: 20, blandas: 20 },
  asociado_mid:         { competencias: 60, tecnico: 20, blandas: 20 },
  asociado_jr:          { competencias: 40, tecnico: 40, blandas: 20 },
  pasante:              { competencias: 40, tecnico: 40, blandas: 20 },

  // Administrativo
  director:             { competencias: 40, tecnico: 40, blandas: 20 },
  gerente:              { competencias: 40, tecnico: 40, blandas: 20 },
  coordinador:          { competencias: 40, tecnico: 40, blandas: 20 },
  analista:             { competencias: 40, tecnico: 40, blandas: 20 },
  asistente:            { competencias: 30, tecnico: 50, blandas: 20 },
  soporte:              { competencias: 30, tecnico: 50, blandas: 20 },
  archivista:           { competencias: 30, tecnico: 50, blandas: 20 },
  dummy:                { competencias: 40, tecnico: 40, blandas: 20 },
};

export function getSectionWeights(position: Position): SectionWeights {
  return SECTION_WEIGHTS[position] ?? { competencias: 40, tecnico: 40, blandas: 20 };
}
