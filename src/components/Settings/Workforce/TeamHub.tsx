import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeams, Team } from '../../../hooks/useTeams';
import { Button, cn } from '../../UI/Primitives';
import { Users, Bot, User, Plus, MoreHorizontal, ArrowUpRight, Network, Search } from 'lucide-react';

interface TeamHubProps {
  onCreateTeam?: () => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  activeFilter?: string;
}

export const TeamHub = ({ onCreateTeam, searchQuery = '', onSearchChange }: TeamHubProps) => {
  const { teams, loading } = useTeams();

    const query = searchQuery.toLowerCase();
    const filteredTeams = teams.filter(t => 
      !query || 
      t.name.toLowerCase().includes(query) || 
      (t.description && t.description.toLowerCase().includes(query))
    );

  return (
    <div className="space-y-6">
      <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] border border-white/20 dark:border-white/5 p-6 lg:p-8 shadow-2xl overflow-hidden">
        <div className="relative max-w-md mb-8 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-600 transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Search teams..." 
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 pl-10 pr-4 text-xs font-bold outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-white/5 dark:backdrop-blur-md shadow-sm"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50" />
            ))
          ) : filteredTeams.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-24 px-6 text-center bg-white/50 dark:bg-zinc-900/40 dark:backdrop-blur-xl border border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem] space-y-6 shadow-sm">
               <div className="h-20 w-20 rounded-[2rem] bg-zinc-50 dark:bg-white/5 flex items-center justify-center text-zinc-300 dark:text-zinc-700">
                  <Network size={40} className="opacity-50" />
               </div>
               <div className="space-y-2 max-w-sm">
                  <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">No Teams Found</h3>
                  <p className="text-sm text-zinc-500 font-medium leading-relaxed">You haven't created any teams yet, or none match your search criteria.</p>
               </div>
               <Button variant="primary" onClick={onCreateTeam} className="gap-2 px-8 mt-4 font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20">
                  <Plus size={16} /> Create Team
               </Button>
            </div>
          ) : (
            filteredTeams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};


const TeamCard = ({ team }: { team: Team }) => {
  const navigate = useNavigate();

  return (
    <div 
      onClick={() => navigate(`/workspace/settings/workforce/teams/${team.id}`)}
      className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] border border-white/20 bg-white/40 backdrop-blur-xl p-6 transition-all hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 cursor-pointer dark:border-white/5 dark:bg-white/[0.03] dark:backdrop-blur-xl shadow-xl shadow-black/5"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 font-bold text-zinc-900 dark:bg-white/5 dark:text-zinc-100 overflow-hidden shadow-sm shadow-black/5 group-hover:shadow-indigo-500/20 transition-all">
            {team.avatar ? (
              <img src={team.avatar} alt={team.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-indigo-500">{team.name[0]?.toUpperCase()}</span>
            )}
          </div>
          <button className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
            <MoreHorizontal size={20} />
          </button>
        </div>

        <div>
           <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{team.name}</h4>
           <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{team.description}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-6 dark:border-zinc-800">
        <div className="flex items-center -space-x-2">
           <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-blue-100 text-blue-600 dark:border-zinc-900 dark:bg-blue-500/20">
             <User size={14} />
           </div>
           <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-purple-100 text-purple-600 dark:border-zinc-900 dark:bg-purple-500/20">
             <Bot size={14} />
           </div>
           <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-zinc-100 text-[10px] font-bold text-zinc-600 dark:border-zinc-900 dark:bg-white/10 dark:text-zinc-400">
             +{team.memberCount + team.agentCount - 2}
           </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
           <div className="flex items-center gap-1.5">
             <User size={12} className="text-zinc-300" /> {team.memberCount}
           </div>
           <div className="flex items-center gap-1.5">
             <Bot size={12} className="text-blue-400" /> {team.agentCount}
           </div>
        </div>
      </div>

      <div className="absolute top-4 right-4 opacity-0 transition-opacity group-hover:opacity-100">
         <ArrowUpRight size={16} className="text-blue-500" />
      </div>
    </div>
  );
};
