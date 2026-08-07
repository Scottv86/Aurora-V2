import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Compass, 
  Plus, 
  Shield, 
  Users, 
  Briefcase, 
  UserCheck, 
  Trash2, 
  Edit3, 
  Layers
} from 'lucide-react';
import { PageHeader } from '../../components/UI/PageHeader';
import { Button } from '../../components/UI/Primitives';
import { motion, AnimatePresence } from 'motion/react';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { API_BASE_URL } from '../../config';

interface MenuItem {
  id: string;
  label: string;
  iconName: string;
  to?: string;
  isVisible?: boolean;
  isSubtitle?: boolean;
  children?: MenuItem[];
}

interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
}

interface AdvancedMenuConfig {
  default: { sections: MenuSection[] };
  roles: Record<string, { sections: MenuSection[] }>;
  teams: Record<string, { sections: MenuSection[] }>;
  positions: Record<string, { sections: MenuSection[] }>;
  users: Record<string, { sections: MenuSection[] }>;
}

export const NavigationManagementPage = () => {
  const navigate = useNavigate();
  const { tenant, updateMenuConfig, refetchContext, members, teams } = usePlatform();
  const { session } = useAuth();

  const [positions, setPositions] = useState<any[]>([]);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [targetType, setTargetType] = useState<'role' | 'team' | 'position' | 'user'>('role');
  const [targetId, setTargetId] = useState('');

  // Fetch Positions on Mount
  useEffect(() => {
    const fetchPositions = async () => {
      if (!tenant?.id) return;
      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        const res = await fetch(`${API_BASE_URL}/api/positions`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant.id
          }
        });
        if (res.ok) {
          const data = await res.json();
          setPositions(data);
        }
      } catch (err) {
        console.error('Failed to fetch positions:', err);
      }
    };
    fetchPositions();
  }, [tenant, session]);

  // Get current menu configuration
  const tConfig = (tenant?.menuConfig as any) || {};
  const advancedConfig: AdvancedMenuConfig = {
    default: tConfig?.default || (tConfig?.sections ? tConfig : { sections: [] }),
    roles: tConfig?.roles || {},
    teams: tConfig?.teams || {},
    positions: tConfig?.positions || {},
    users: tConfig?.users || {}
  };

  const defaultSections = advancedConfig.default?.sections || [];

  // Helper count total items inside sections
  const countItems = (sections: MenuSection[]) => {
    let count = 0;
    sections.forEach(sec => {
      count += (sec.items || []).length;
      sec.items?.forEach(item => {
        if (item.children) count += item.children.length;
      });
    });
    return count;
  };

  // Handle resetting an override
  const handleResetOverride = async (type: 'default' | 'role' | 'team' | 'position' | 'user', id: string, name: string) => {
    try {
      const updated = { ...advancedConfig };
      if (type === 'role') {
        const { [id]: _, ...rest } = updated.roles;
        updated.roles = rest;
      } else if (type === 'team') {
        const { [id]: _, ...rest } = updated.teams;
        updated.teams = rest;
      } else if (type === 'position') {
        const { [id]: _, ...rest } = updated.positions;
        updated.positions = rest;
      } else if (type === 'user') {
        const { [id]: _, ...rest } = updated.users;
        updated.users = rest;
      }

      await updateMenuConfig(updated as any, 'tenant');
      await refetchContext();
      toast.success(`Override for ${name} reset to default.`);
    } catch (err) {
      toast.error(`Failed to reset override for ${name}`);
    }
  };

  // Handle creating a new override
  const handleCreateOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId) {
      toast.error('Please select a target.');
      return;
    }

    setShowCreateModal(false);
    navigate(`/workspace/settings/navigation/builder?scopeType=${targetType}&scopeId=${encodeURIComponent(targetId)}`);
  };

  // Collate all active navigation cards
  const navigationCards: Array<{
    id: string;
    type: 'default' | 'role' | 'team' | 'position' | 'user';
    targetId: string;
    title: string;
    subtitle: string;
    icon: any;
    sections: MenuSection[];
    isDefault?: boolean;
  }> = [
    {
      id: 'default',
      type: 'default',
      targetId: '',
      title: (advancedConfig.default as any)?.title || 'Workspace Navigation',
      subtitle: 'Primary global navigation menu for all users',
      icon: Compass,
      sections: defaultSections,
      isDefault: true
    }
  ];

  // Add Roles overrides
  Object.entries(advancedConfig.roles).forEach(([roleName, config]) => {
    navigationCards.push({
      id: `role:${roleName}`,
      type: 'role',
      targetId: roleName,
      title: (config as any).title || `Role: ${roleName}`,
      subtitle: `Targeted navigation override for ${roleName} role`,
      icon: Shield,
      sections: config.sections || []
    });
  });

  // Add Teams overrides
  Object.entries(advancedConfig.teams).forEach(([teamId, config]) => {
    const t = teams.find(team => team.id === teamId);
    const teamName = t ? t.name : teamId;
    navigationCards.push({
      id: `team:${teamId}`,
      type: 'team',
      targetId: teamId,
      title: (config as any).title || `Team: ${teamName}`,
      subtitle: `Targeted navigation override for ${teamName} team`,
      icon: Users,
      sections: config.sections || []
    });
  });

  // Add Position overrides
  Object.entries(advancedConfig.positions).forEach(([posId, config]) => {
    const p = positions.find(pos => pos.id === posId);
    const posTitle = p ? p.title : posId;
    navigationCards.push({
      id: `position:${posId}`,
      type: 'position',
      targetId: posId,
      title: (config as any).title || `Position: ${posTitle}`,
      subtitle: `Targeted navigation override for ${posTitle} position`,
      icon: Briefcase,
      sections: config.sections || []
    });
  });

  // Add User overrides
  Object.entries(advancedConfig.users).forEach(([userId, config]) => {
    const m = members.find(mem => mem.id === userId);
    const userName = m ? m.name : userId;
    navigationCards.push({
      id: `user:${userId}`,
      type: 'user',
      targetId: userId,
      title: (config as any).title || `User: ${userName}`,
      subtitle: `Targeted navigation override for ${userName}`,
      icon: UserCheck,
      sections: config.sections || []
    });
  });

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-4rem)] bg-zinc-50/50 dark:bg-zinc-950/50 relative select-none">
      <PageHeader 
        title="Navigation"
        description="Design and manage global workspace navigation menus, horizontal/vertical shell layouts, and role/team navigation schemes."
        actions={
          <Button onClick={() => setShowCreateModal(true)} className="gap-2 shadow-lg shadow-indigo-500/10">
            <Plus size={16} />
            Create Navigation
          </Button>
        }
      />

      <div className="flex-1 px-6 lg:px-12 pt-8 pb-20 relative z-10 space-y-8">



        {/* Navigation Menus Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {navigationCards.map((card, i) => {
            const IconComponent = card.icon;
            const categoryCount = card.sections.length;
            const itemTotal = countItems(card.sections);

            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => navigate(`/workspace/settings/navigation/builder?scopeType=${card.type}&scopeId=${encodeURIComponent(card.targetId)}`)}
                className={cn(
                  "group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border rounded-3xl transition-all shadow-xl shadow-black/5 dark:shadow-none cursor-pointer flex flex-col h-full relative overflow-hidden",
                  card.isDefault
                    ? "border-indigo-500/50 shadow-indigo-500/5 dark:border-indigo-500/30"
                    : "border-white/20 dark:border-white/5 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-indigo-500/10"
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Reset Override Button */}
                {!card.isDefault && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResetOverride(card.type, card.targetId, card.title);
                    }}
                    className="absolute top-4 right-4 p-2 rounded-xl bg-zinc-100/80 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 dark:bg-zinc-800/80 dark:hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100 z-20"
                    title="Reset Override to Default"
                  >
                    <Trash2 size={14} />
                  </button>
                )}

                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className={cn(
                        "p-3 rounded-2xl border transition-all",
                        card.isDefault 
                          ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-500" 
                          : "bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-500 group-hover:text-indigo-500 group-hover:border-indigo-500/30"
                      )}>
                        <IconComponent size={22} />
                      </div>
                      
                      <span className={cn(
                        "text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border",
                        card.isDefault
                          ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/30"
                          : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                      )}>
                        {card.isDefault ? 'Default' : 'Override'}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {card.subtitle}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Layers size={13} className="text-zinc-400" />
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">{categoryCount}</span> Categories
                      <span className="text-zinc-300 dark:text-zinc-700">•</span>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">{itemTotal}</span> Items
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-indigo-500 group-hover:translate-x-1 transition-transform">
                      Edit in Builder <Edit3 size={14} />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>

      {/* CREATE NAVIGATION OVERRIDE MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5"
            >
              <form onSubmit={handleCreateOverride} className="space-y-5">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Plus size={18} className="text-indigo-500" /> Create Navigation Override
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">Select a role, team, position, or specific member to create a targeted menu override.</p>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Target Type selector */}
                  <div>
                    <label className="font-bold text-zinc-500 uppercase block mb-1.5">Target Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { setTargetType('role'); setTargetId(''); }}
                        className={cn("py-2 px-3 rounded-xl border text-center font-bold uppercase transition-all", targetType === 'role' ? "bg-indigo-600 text-white border-indigo-600" : "border-zinc-200 dark:border-zinc-800 text-zinc-400")}
                      >
                        Role
                      </button>
                      <button
                        type="button"
                        onClick={() => { setTargetType('team'); setTargetId(''); }}
                        className={cn("py-2 px-3 rounded-xl border text-center font-bold uppercase transition-all", targetType === 'team' ? "bg-indigo-600 text-white border-indigo-600" : "border-zinc-200 dark:border-zinc-800 text-zinc-400")}
                      >
                        Team
                      </button>
                      <button
                        type="button"
                        onClick={() => { setTargetType('position'); setTargetId(''); }}
                        className={cn("py-2 px-3 rounded-xl border text-center font-bold uppercase transition-all", targetType === 'position' ? "bg-indigo-600 text-white border-indigo-600" : "border-zinc-200 dark:border-zinc-800 text-zinc-400")}
                      >
                        Position
                      </button>
                      <button
                        type="button"
                        onClick={() => { setTargetType('user'); setTargetId(''); }}
                        className={cn("py-2 px-3 rounded-xl border text-center font-bold uppercase transition-all", targetType === 'user' ? "bg-indigo-600 text-white border-indigo-600" : "border-zinc-200 dark:border-zinc-800 text-zinc-400")}
                      >
                        Specific Member
                      </button>
                    </div>
                  </div>

                  {/* Target Value dropdown */}
                  <div>
                    <label className="font-bold text-zinc-500 uppercase block mb-1.5">Select Target</label>
                    {targetType === 'role' && (
                      <select
                        value={targetId}
                        onChange={(e) => setTargetId(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 outline-none font-medium"
                      >
                        <option value="">Select Role...</option>
                        <option value="Admin">Role: Admin</option>
                        <option value="Developer">Role: Developer</option>
                        <option value="Standard">Role: Standard</option>
                      </select>
                    )}

                    {targetType === 'team' && (
                      <select
                        value={targetId}
                        onChange={(e) => setTargetId(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 outline-none font-medium"
                      >
                        <option value="">Select Team...</option>
                        {teams.map(t => (
                          <option key={t.id} value={t.id}>Team: {t.name}</option>
                        ))}
                      </select>
                    )}

                    {targetType === 'position' && (
                      <select
                        value={targetId}
                        onChange={(e) => setTargetId(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 outline-none font-medium"
                      >
                        <option value="">Select Position...</option>
                        {positions.map(p => (
                          <option key={p.id} value={p.id}>Position: {p.title}</option>
                        ))}
                      </select>
                    )}

                    {targetType === 'user' && (
                      <select
                        value={targetId}
                        onChange={(e) => setTargetId(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 outline-none font-medium"
                      >
                        <option value="">Select Member...</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>Member: {m.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                  <Button type="submit" className="gap-1.5">
                    <Edit3 size={14} /> Create & Open Builder
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
