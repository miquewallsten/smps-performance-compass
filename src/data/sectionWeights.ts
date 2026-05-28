import { Position, EvalSection } from '@/types';

/**
 * Peso GLOBAL de cada sección por posición (suma 100%).
 * Fuente: hoja 2 del archivo "Criterios técnicos legal - SDC".
 *
 * Las posiciones administrativas no tienen sección "técnico" en el modelo
 * (en su lugar todo lo no-blando va a "competencias"). Para mantener la
 * estructura de 3 secciones consistente, dejamos `tecnico: 0` y compensamos
 * en `competencias`.
 *
 * Se incluyen aliases para posiciones legacy (pasante_corporativo, archivo_soporte)
 * que mapean a los mismos pesos que sus contrapartes actuales.
 */
export type SectionWeights = Record<EvalSection, number>;

export const SECTION_WEIGHTS: Record<Position, SectionWeights> = {
  // Legal
  socio:                { tecnico: 50, competencias: 25, blandas: 25 },
  salary_partner:       { tecnico: 50, competencias: 25, blandas: 25 },
  counsel:              { tecnico: 100, competencias: 0, blandas: 0 },

  asociado_sr:          { tecnico: 60, competencias: 20, blandas: 20 },
  asociado_mid:         { tecnico: 60, competencias: 20, blandas: 20 },
  asociado_jr:          { tecnico: 40, competencias: 40, blandas: 20 },
  pasante_carrera:      { tecnico: 40, competencias: 40, blandas: 20 },
  pasante_corporativo:  { tecnico: 40, competencias: 40, blandas: 20 },
  pasante:              { tecnico: 40, competencias: 40, blandas: 20 },
  // Administrativo (sin "Criterio Técnico" → todo competencias/blandas)
  director:             { tecnico: 0, competencias: 80, blandas: 20 },
  gerente:              { tecnico: 0, competencias: 80, blandas: 20 },
  coordinador:          { tecnico: 0, competencias: 80, blandas: 20 },
  analista:             { tecnico: 0, competencias: 80, blandas: 20 },
  asistente:            { tecnico: 0, competencias: 50, blandas: 50 },
  archivo_soporte:      { tecnico: 0, competencias: 50, blandas: 50 },
  soporte:             { tecnico: 0, competencias: 50, blandas: 50 },
  archivista:           { tecnico: 0, competencias: 50, blandas: 50 },
  dummy:                { tecnico: 40, competencias: 40, blandas: 20 },
};

export function getSectionWeights(position: Position): SectionWeights {
  return SECTION_WEIGHTS[position] ?? { tecnico: 0, competencias: 80, blandas: 20 };
}
