import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  /** Prefetch queries on hover — maps route paths to query keys */
  prefetchKeys?: string[][];
}

/**
 * Enhanced NavLink that prefetches data on hover.
 * Pass `prefetchKeys` to specify which queries to prefetch when the user hovers.
 * Example: <NavLink to="/dashboard" prefetchKeys={[['users'], ['evaluations', { period }]]} />
 */
const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, prefetchKeys, ...props }, ref) => {
    const qc = useQueryClient();

    const handleMouseEnter = () => {
      if (prefetchKeys) {
        for (const key of prefetchKeys) {
          qc.prefetchQuery({ queryKey: key });
        }
      }
    };

    return (
      <RouterNavLink
        ref={ref}
        to={to}
        onMouseEnter={handleMouseEnter}
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
