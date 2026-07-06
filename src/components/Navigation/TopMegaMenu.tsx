import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { ChevronDown, Box } from 'lucide-react';
import { cn } from '../../lib/utils';
import { MenuConfig, MenuItem } from '../../types/menu';

interface TopMegaMenuProps {
  menuConfig: MenuConfig | null;
}

export const TopMegaMenu = ({ menuConfig }: TopMegaMenuProps) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  if (!menuConfig || !menuConfig.sections) return null;

  return (
    <nav className="flex items-center gap-2 h-full text-sm font-medium">
      {menuConfig.sections.map((section) => {
        const visibleItems = section.items?.filter(i => i.isVisible !== false) || [];
        if (visibleItems.length === 0) return null;

        const hasDropdown = visibleItems.length > 0;

        return (
          <div 
            key={section.id} 
            className="relative h-full flex items-center"
            onMouseEnter={() => setActiveSection(section.id)}
            onMouseLeave={() => setActiveSection(null)}
          >
            <button
              type="button"
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900/50 transition-all duration-200",
                activeSection === section.id && "bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white"
              )}
            >
              <span className="text-xs font-bold uppercase tracking-wider">{section.title}</span>
              {hasDropdown && <ChevronDown size={12} className={cn("transition-transform duration-200 text-zinc-400", activeSection === section.id && "rotate-180")} />}
            </button>

            {hasDropdown && activeSection === section.id && (
              <div className="absolute left-0 top-full pt-1.5 z-50">
                <div className="w-[300px] bg-white/95 dark:bg-zinc-950/95 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl backdrop-blur-xl p-3.5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="space-y-1">
                    {visibleItems.map((item) => (
                      <MegaMenuItemRenderer key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
};

const MegaMenuItemRenderer = ({ item, depth = 0 }: { item: MenuItem; depth?: number }) => {
  const IconComponent = (LucideIcons as any)[item.iconName] || Box;
  const navigate = useNavigate();

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
          }
        }}
        className={({ isActive }) => cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200",
          depth > 0 ? "pl-8" : "",
          isActive 
            ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" 
            : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
        )}
      >
        <IconComponent size={14} className="shrink-0 text-zinc-400 dark:text-zinc-500" />
        <span className="truncate flex-1 text-left">{item.label}</span>
      </NavLink>

      {hasChildren && (
        <div className="space-y-0.5">
          {item.children!.map((child: MenuItem) => (
            <MegaMenuItemRenderer key={child.id} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};
