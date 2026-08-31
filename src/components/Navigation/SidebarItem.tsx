import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePlatform } from '../../hooks/usePlatform';
import { fetchModule, fetchRecords } from '../../services/dataService';
import { cn } from '../../lib/utils';

interface SidebarItemProps {
  icon: any;
  label: string;
  active?: boolean;
  to?: string;
  badge?: string;
  nested?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
  className?: string;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: (e: React.MouseEvent) => void;
}

export const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  to, 
  badge, 
  nested, 
  collapsed, 
  onClick, 
  className,
  hasChildren,
  isExpanded,
  onToggleExpand
}: SidebarItemProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { tenant, modules } = usePlatform();
  const isComingSoon = !to && !onClick && !(hasChildren && onToggleExpand);

  const [isHovered, setIsHovered] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; height: number; minWidth: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top,
        height: rect.height,
        left: rect.left,
        minWidth: rect.width,
      });
    }
  };

  const handleMouseEnter = () => {
    if (collapsed) {
      updateCoords();
      setIsHovered(true);
    }

    // Only prefetch for module links
    if (!to || !to.includes('/workspace/modules/') || !tenant?.id) return;
    
    // Extract moduleId from path
    const moduleId = to.split('/').pop();
    if (!moduleId) return;

    // Ensure we have a token (dev or session)
    const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
    if (!token) return;

    // Prefetch module definition
    queryClient.prefetchQuery({
      queryKey: ['module', tenant.id, moduleId],
      queryFn: () => fetchModule(moduleId, tenant.id, token, modules),
      staleTime: 1000 * 60 * 5,
    });

    // Prefetch records (page 1)
    queryClient.prefetchQuery({
      queryKey: ['records', tenant.id, moduleId, 1, 25],
      queryFn: () => fetchRecords(moduleId, tenant.id, token, 1, 25),
      staleTime: 1000 * 60 * 5,
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => {
          e.preventDefault();
          setIsHovered(false);
          if (onClick) {
            onClick();
            return;
          }
          if (hasChildren && onToggleExpand && !to) {
            onToggleExpand(e);
            return;
          }
          if (to) navigate(to);
        }}
        disabled={isComingSoon}
        className={cn(
          "w-full flex items-center transition-all duration-200 group relative",
          collapsed ? "justify-center px-0 py-2 rounded-lg" : "gap-3 px-3 py-2 rounded-lg",
          !collapsed && nested && "pl-9",
          active 
            ? "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm" 
            : isComingSoon
              ? "text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5",
          className
        )}
      >
        <div className="relative shrink-0 flex items-center justify-center">
          <Icon size={18} className={cn("transition-colors", active ? "text-indigo-600 dark:text-white" : isComingSoon ? "text-zinc-300 dark:text-zinc-700" : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300")} />
          {collapsed && badge && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-zinc-900" />
          )}
        </div>
        {!collapsed && (
          <>
            <span className="text-sm font-medium flex-1 text-left truncate">{label}</span>
            {badge && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-xs">
                {badge}
              </span>
            )}
            {isComingSoon && (
              <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700 uppercase tracking-tighter">
                Soon
              </span>
            )}
            {hasChildren && onToggleExpand && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onToggleExpand(e);
                }}
                className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <ChevronDown size={14} className={cn("transition-transform duration-200", isExpanded && "rotate-180")} />
              </div>
            )}
          </>
        )}
      </button>

      {/* Collapsed mode hover slide-out label: single unified block covering the icon and expanding to the right over the app */}
      {collapsed && isHovered && coords && typeof document !== 'undefined' && createPortal(
        <div 
          style={{ 
            position: 'fixed', 
            top: `${coords.top}px`, 
            height: `${coords.height}px`,
            left: `${coords.left}px`,
            minWidth: `${coords.minWidth}px`,
          }}
          className="z-[99999] pointer-events-none flex items-center animate-in fade-in zoom-in-[0.98] slide-in-from-left-1 duration-150 ease-out"
        >
          <div className={cn(
            "flex items-center gap-3 h-full px-3 rounded-lg whitespace-nowrap shadow-2xl shadow-black/40 border transition-colors",
            active
              ? "bg-zinc-900 dark:bg-zinc-800 text-white border-zinc-700/80 ring-1 ring-white/10"
              : "bg-zinc-900/95 dark:bg-zinc-800/95 text-white dark:text-zinc-100 border-zinc-700/70 backdrop-blur-md"
          )}>
            <div className="shrink-0 flex items-center justify-center">
              <Icon size={18} className={cn(active ? "text-indigo-400 dark:text-white" : "text-zinc-300 dark:text-zinc-300")} />
            </div>
            <span className="text-sm font-medium tracking-normal text-white dark:text-zinc-100 pr-1">{label}</span>
            {badge && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-500 text-white shadow-xs">
                {badge}
              </span>
            )}
            {isComingSoon && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 dark:bg-zinc-700 text-zinc-400 uppercase tracking-wider border border-zinc-700">
                Soon
              </span>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
