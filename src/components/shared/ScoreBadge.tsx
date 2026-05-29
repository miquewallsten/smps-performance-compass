import { cn } from '@/lib/utils';

type BadgeSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'text-[11px] min-w-[32px] py-0 px-1.5',
  md: 'text-xs min-w-[40px] py-0.5 px-2',
  lg: 'text-sm min-w-[48px] py-1 px-2.5',
};

function scoreColor(v: number | null): string {
  if (v === null) return '';
  if (v >= 90) return 'bg-smps-success/15 text-smps-success';
  if (v >= 80) return 'bg-smps-gold/15 text-smps-gold';
  if (v >= 70) return 'bg-smps-warning/15 text-smps-warning';
  return 'bg-destructive/15 text-destructive';
}

export function ScoreBadge({ value, size = 'md', className }: { value: number | null; size?: BadgeSize; className?: string }) {
  if (value === null) return <span className={cn('inline-block rounded font-display font-bold tabular-nums', sizeClasses[size], 'bg-muted/40 text-muted-foreground', className)}>—</span>;
  return (
    <span className={cn('inline-block rounded font-display font-bold tabular-nums', sizeClasses[size], scoreColor(value), className)}>
      {value}%
    </span>
  );
}

export function scoreColorText(v: number | null): string {
  if (v === null) return 'text-muted-foreground';
  if (v >= 90) return 'text-smps-success';
  if (v >= 80) return 'text-smps-gold';
  if (v >= 70) return 'text-smps-warning';
  return 'text-destructive';
}

export function scoreBgClass(v: number | null): string {
  if (v === null) return 'bg-muted/40';
  if (v >= 90) return 'bg-smps-success/15';
  if (v >= 80) return 'bg-smps-gold/15';
  if (v >= 70) return 'bg-smps-warning/15';
  return 'bg-destructive/15';
}
