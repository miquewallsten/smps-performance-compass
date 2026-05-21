import { LEGAL_HIERARCHY, ADMIN_HIERARCHY, POSITION_LABELS, POSITION_HIERARCHY, Position } from '@/types';

interface Props {
  levelFilter: string;
  setLevelFilter: (v: string) => void;
  positionFilter: string;
  setPositionFilter: (v: string) => void;
  className?: string;
}

export default function HierarchyFilters({ levelFilter, setLevelFilter, positionFilter, setPositionFilter, className = '' }: Props) {
  const positions = levelFilter === 'legal'
    ? LEGAL_HIERARCHY
    : levelFilter === 'administrativo'
      ? ADMIN_HIERARCHY
      : POSITION_HIERARCHY;

  return (
    <div className={`flex gap-2 flex-wrap ${className}`}>
      <select value={levelFilter} onChange={e => { setLevelFilter(e.target.value); setPositionFilter('all'); }}
        className="px-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent">
        <option value="all">Todos</option>
        <option value="legal">Legal</option>
        <option value="administrativo">Administrativo</option>
      </select>
      <select value={positionFilter} onChange={e => setPositionFilter(e.target.value)}
        className="px-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent">
        <option value="all">Todas las posiciones</option>
        {positions.map(p => <option key={p} value={p}>{POSITION_LABELS[p]}</option>)}
      </select>
    </div>
  );
}

export function filterByHierarchy<T extends { position: Position }>(items: T[], levelFilter: string, positionFilter: string): T[] {
  let result = items;
  if (levelFilter === 'legal') result = result.filter(u => LEGAL_HIERARCHY.includes(u.position));
  else if (levelFilter === 'administrativo') result = result.filter(u => ADMIN_HIERARCHY.includes(u.position));
  if (positionFilter !== 'all') result = result.filter(u => u.position === positionFilter);
  return result;
}
