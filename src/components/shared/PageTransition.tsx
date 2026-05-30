import { motion } from 'framer-motion';
import { ReactNode } from 'react';

/**
 * Simple fade+slide-up on mount. NO exit animation — this prevents
 * the content area from collapsing to zero height between routes,
 * which caused the full-page flicker.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger animation wrapper for lists / cards.
 * Usage: <StaggerList>{items.map(...)}</StaggerList>
 */
export function StaggerList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.05 } },
        hidden: {},
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Individual stagger item — wraps each list/card child.
 */
export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Fade-in on mount — for standalone sections.
 */
export function FadeIn({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Scale-in for score badges, success indicators, etc.
 */
export function PopIn({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
