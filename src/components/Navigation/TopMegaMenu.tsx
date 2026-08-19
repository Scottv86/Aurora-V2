import { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { ChevronDown, Box, Compass, LayoutDashboard, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';
import { MenuConfig, MenuItem } from '../../types/menu';

interface TopMegaMenuProps {
  menuConfig: MenuConfig | null;
  isDeveloper: boolean;
}

export const TopMegaMenu = ({ menuConfig, isDeveloper }: TopMegaMenuProps) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActiveSection(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const visibleSections = menuConfig?.sections?.filter(section => {
    const visibleItems = section.items?.filter(i => i.isVisible !== false) || [];
    return visibleItems.length > 0;
  }) || [];

  const isEmpty = visibleSections.length === 0;

  if (isEmpty) {
    return (
      <div className="flex items-center justify-between w-full text-xs">
        <div className="flex items-center gap-2 text-zinc-500">
          <LayoutDashboard size={14} className="text-zinc-400 shrink-0" />
          {isDeveloper ? (
            <span>No top menu items configured. Design your layout in settings.</span>
          ) : (
            <span>Welcome to Aurora. No menu items configured. Please contact your administrator.</span>
          )}
        </div>
        {isDeveloper && (
          <NavLink
            to="/workspace/settings/navigation/builder"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-sm shrink-0"
          >
            <Settings size={12} />
            <span>Configure Menu</span>
          </NavLink>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex items-center justify-between w-full h-full gap-4 relative">
      <nav className="flex items-center gap-1.5 h-full text-sm font-medium">
        {visibleSections.map((section) => {
          const visibleItems = section.items?.filter(i => i.isVisible !== false) || [];
          if (visibleItems.length === 0) return null;

          const hasDropdown = visibleItems.length > 0;
          const isOpen = activeSection === section.id;

          return (
            <div 
              key={section.id} 
              className="relative h-full flex items-center"
              onMouseEnter={() => setActiveSection(section.id)}
              onMouseLeave={() => setActiveSection(null)}
            >
              <button
                type="button"
                onClick={() => setActiveSection(isOpen ? null : section.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer select-none",
                  isOpen 
                    ? "bg-zinc-100 dark:bg-zinc-800/90 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/70 dark:hover:bg-zinc-900/60"
                )}
              >
                <span>{section.title}</span>
                {hasDropdown && (
                  <ChevronDown 
                    size={12} 
                    className={cn(
                      "transition-transform duration-200 text-zinc-400 shrink-0", 
                      isOpen && "rotate-180 text-indigo-500"
                    )} 
                  />
                )}
              </button>

              {hasDropdown && isOpen && (
                <div className="absolute left-0 top-full pt-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="w-[300px] bg-white/95 dark:bg-zinc-950/95 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-2xl p-3 space-y-1.5 ring-1 ring-black/5 dark:ring-white/5">
                    <div className="px-2 py-1 border-b border-zinc-100 dark:border-zinc-850 flex items-center justify-between mb-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{section.title}</span>
                      <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-600">{visibleItems.length} items</span>
                    </div>
                    <div className="space-y-1 max-h-[65vh] overflow-y-auto custom-scrollbar pr-0.5">
                      {visibleItems.map((item) => (
                        <MegaMenuItemRenderer 
                          key={item.id} 
                          item={item} 
                          onItemClick={() => setActiveSection(null)} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>
      {isDeveloper && (
        <NavLink
          to="/workspace/settings/navigation/builder"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50/70 hover:bg-indigo-100/80 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs transition-all shadow-sm shrink-0 border border-indigo-200/50 dark:border-indigo-500/20 group"
        >
          <Compass size={13} className="text-indigo-500 group-hover:rotate-45 transition-transform duration-300 shrink-0" />
          <span>Configure Menu</span>
        </NavLink>
      )}
    </div>
  );
};

const MegaMenuItemRenderer = ({ 
  item, 
  depth = 0, 
  onItemClick 
}: { 
  item: MenuItem; 
  depth?: number; 
  onItemClick?: () => void;
}) => {
  const IconComponent = (LucideIcons as any)[item.iconName] || Box;

  // If item is a subtitle (section divider/header)
  if ((item as any).isSubtitle) {
    return (
      <div 
        className={cn(
          "text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-3 pt-2 pb-1",
          depth > 0 && "pl-8"
        )}
      >
        {item.label}
      </div>
    );
  }

  const hasChildren = item.children && item.children.length > 0;

  return (
    <div className="space-y-1">
      <NavLink
        to={item.to || '#'}
        onClick={(e) => {
          if (!item.to) {
            e.preventDefault();
          } else if (onItemClick) {
            onItemClick();
          }
        }}
        className={({ isActive }) => cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 group",
          depth > 0 ? "pl-8" : "",
          isActive 
            ? "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold" 
            : "text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/80 dark:hover:bg-zinc-900/70"
        )}
      >
        <div className="p-1 rounded-lg bg-zinc-100/70 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 group-hover:text-indigo-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/20 transition-colors shrink-0">
          <IconComponent size={13} />
        </div>
        <span className="truncate flex-1 text-left">{item.label}</span>
      </NavLink>

      {hasChildren && (
        <div className="space-y-0.5 pl-2 border-l border-zinc-200/60 dark:border-zinc-800/60 ml-3">
          {item.children!.map((child: MenuItem) => (
            <MegaMenuItemRenderer 
              key={child.id} 
              item={child} 
              depth={depth + 1} 
              onItemClick={onItemClick} 
            />
          ))}
        </div>
      )}
    </div>
  );
};
