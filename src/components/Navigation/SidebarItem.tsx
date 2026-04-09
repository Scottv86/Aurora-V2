import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';

interface SidebarItemProps {
  icon: any;
  label: string;
  active?: boolean;
  to?: string;
  badge?: string;
  nested?: boolean;
  onClick?: () => void;
}

export const SidebarItem = ({ icon: Icon, label, active, to, badge, nested, onClick }: SidebarItemProps) => {
  const navigate = useNavigate();
  const isComingSoon = !to && !onClick;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        if (onClick) {
          onClick();
          return;
        }
        if (to) navigate(to);
      }}
      disabled={isComingSoon}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group",
        nested && "pl-9",
        active 
          ? "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm" 
          : isComingSoon
            ? "text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5"
      )}
    >
      <Icon size={18} className={cn("transition-colors", active ? "text-indigo-600 dark:text-white" : isComingSoon ? "text-zinc-300 dark:text-zinc-700" : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300")} />
      <span className="text-sm font-medium flex-1 text-left">{label}</span>
      {badge && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 dark:border-indigo-500/30">
          {badge}
        </span>
      )}
      {isComingSoon && (
        <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700 uppercase tracking-tighter">
          Soon
        </span>
      )}
    </button>
  );
};
