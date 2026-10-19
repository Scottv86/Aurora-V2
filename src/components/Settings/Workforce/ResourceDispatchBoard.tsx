import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  AlertTriangle, 
  UserCheck, 
  Search, 
  Briefcase, 
  Award,
  UserX,
  CalendarDays,
  Loader2
} from 'lucide-react';
import { usePlatform } from '../../../context/PlatformContext';
import { useAuth } from '../../../hooks/useAuth';
import { API_BASE_URL } from '../../../config';
import { toast } from 'sonner';

interface WorkforceMemberWithHR {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  position?: string;
  team?: string;
  skills: { name: string; level: string }[];
  certifications: { id: string; name: string; expiryDate: string | null; isExpired: boolean }[];
  leaveStatus: { isOnLeave: boolean; leaveType?: string; until?: string };
  shifts: { [day: string]: string }; // e.g. "Mon": "08:00 - 16:30"
}

interface DispatchWorkItem {
  id: string;
  title: string;
  requiredSkill?: string;
  requiredCertification?: string;
  location?: string;
  date: string;
  assignedMemberId?: string;
  status: 'UNASSIGNED' | 'ASSIGNED' | 'COMPLETED';
}

export const ResourceDispatchBoard: React.FC = () => {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
  const [members, setMembers] = useState<WorkforceMemberWithHR[]>([]);
  const [workItems, setWorkItems] = useState<DispatchWorkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeItemForAssignment, setActiveItemForAssignment] = useState<DispatchWorkItem | null>(null);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const fetchDispatchData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/members`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || '' 
        }
      });
      if (res.ok) {
        const rawMembers = await res.json();
        
        // Enhance members with certifications & skills
        const enhanced: WorkforceMemberWithHR[] = (Array.isArray(rawMembers) ? rawMembers : []).map((m: any, idx: number) => {
          const certs = (m.certifications || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            expiryDate: c.expiryDate,
            isExpired: c.expiryDate ? new Date(c.expiryDate) < new Date() : false
          }));

          // Mock default shift roster if none
          const shifts: any = {
            Monday: idx % 4 === 0 ? 'Off (RDO)' : '08:00 - 16:30',
            Tuesday: '08:00 - 16:30',
            Wednesday: '08:00 - 16:30',
            Thursday: idx % 3 === 0 ? '12:00 - 20:30' : '08:00 - 16:30',
            Friday: '08:00 - 16:00',
            Saturday: idx % 5 === 0 ? '09:00 - 14:00' : 'Off',
            Sunday: 'Off'
          };

          return {
            id: m.id,
            name: `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.trim() || m.user?.email || `Staff #${m.id.slice(0, 6)}`,
            email: m.user?.email,
            avatarUrl: m.avatarUrl,
            position: m.position?.title || 'Field Specialist',
            team: m.team?.name || 'General Operations',
            skills: (m.skills || []).map((s: any) => ({ name: s.name, level: s.proficiencyLevel || 'Proficient' })),
            certifications: certs.length > 0 ? certs : [
              { id: `c1_${m.id}`, name: 'Workplace Safety Level 2', expiryDate: '2027-01-01', isExpired: false }
            ],
            leaveStatus: {
              isOnLeave: idx === 2,
              leaveType: idx === 2 ? 'Annual Leave' : undefined,
              until: idx === 2 ? 'Next Monday' : undefined
            },
            shifts
          };
        });

        setMembers(enhanced);

        // Seed sample dispatchable work tickets
        setWorkItems([
          {
            id: 'WO-8821',
            title: 'Substation Transformer Calibration',
            requiredSkill: 'High Voltage',
            requiredCertification: 'Electrical Safety Tier 3',
            location: 'Site A - East Wing',
            date: 'Today',
            status: 'UNASSIGNED'
          },
          {
            id: 'WO-8824',
            title: 'Critical HVAC Chiller Overhaul',
            requiredSkill: 'HVAC Mechanical',
            requiredCertification: 'Refrigerant Handling License',
            location: 'North Tower Basement',
            date: 'Today',
            status: 'UNASSIGNED'
          },
          {
            id: 'WO-8827',
            title: 'Fire Suppression Valve Inspection',
            requiredSkill: 'Safety & Compliance',
            requiredCertification: 'Workplace Safety Level 2',
            location: 'Logistics Depot Warehouse',
            date: 'Today',
            status: 'UNASSIGNED'
          }
        ]);
      }
    } catch (e: any) {
      toast.error('Failed to load dispatch data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tenant?.id) {
      fetchDispatchData();
    }
  }, [tenant?.id]);

  const handleAssignWorker = (member: WorkforceMemberWithHR) => {
    if (!activeItemForAssignment) return;

    // Compliance Check 1: Is member on leave?
    if (member.leaveStatus.isOnLeave) {
      toast.error(`Compliance Block: Cannot assign ${member.name}. Staff member is on approved ${member.leaveStatus.leaveType} until ${member.leaveStatus.until}.`);
      return;
    }

    // Compliance Check 2: Expired Certification
    const requiredCert = activeItemForAssignment.requiredCertification;
    if (requiredCert) {
      const foundCert = member.certifications.find(c => c.name.toLowerCase().includes(requiredCert.toLowerCase()) || requiredCert.toLowerCase().includes(c.name.toLowerCase()));
      if (!foundCert) {
        toast.error(`Compliance Block: ${member.name} lacks the required active credential "${requiredCert}".`);
        return;
      }
      if (foundCert.isExpired) {
        toast.error(`Safety Violation: ${member.name}'s certification "${foundCert.name}" expired on ${foundCert.expiryDate}. Assignment blocked by safety policy.`);
        return;
      }
    }

    // Success
    setWorkItems(prev => prev.map(w => w.id === activeItemForAssignment.id ? { ...w, assignedMemberId: member.id, status: 'ASSIGNED' } : w));
    toast.success(`Successfully dispatched ${member.name} to ${activeItemForAssignment.title}!`);
    setActiveItemForAssignment(null);
  };

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.position?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.team?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <CalendarDays size={22} />
            </div>
            <div>
              <h2 className="text-base font-black text-zinc-900 dark:text-white">Field Service &amp; Resource Dispatch Board</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Shift scheduling, real-time availability, and safety-verified worker assignment
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search personnel, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl">
            {daysOfWeek.map(day => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                  selectedDay === day
                    ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Unassigned Orders on Left, Workforce Roster on Right */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 text-zinc-400 gap-3 shadow-xs">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Loading workforce dispatch schedule...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Unassigned Dispatch Orders */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Briefcase size={14} className="text-indigo-500" />
                <span>Unassigned Service Jobs ({workItems.filter(w => w.status === 'UNASSIGNED').length})</span>
              </h3>
            </div>

          <div className="space-y-3">
            {workItems.map(item => (
              <div
                key={item.id}
                onClick={() => setActiveItemForAssignment(activeItemForAssignment?.id === item.id ? null : item)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  activeItemForAssignment?.id === item.id
                    ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                    : item.status === 'ASSIGNED'
                    ? 'bg-zinc-50/60 dark:bg-zinc-900/40 border-zinc-200/60 dark:border-zinc-800/60 opacity-60'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[10px] font-bold text-zinc-400">{item.id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    item.status === 'ASSIGNED'
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {item.status}
                  </span>
                </div>

                <h4 className="text-xs font-black text-zinc-900 dark:text-white mb-2">{item.title}</h4>

                <div className="space-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-zinc-400" />
                    <span>Target Date: {item.date}</span>
                  </div>
                  {item.requiredCertification && (
                    <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold">
                      <Award size={12} />
                      <span>Requires: {item.requiredCertification}</span>
                    </div>
                  )}
                </div>

                {activeItemForAssignment?.id === item.id && (
                  <div className="mt-3 pt-2.5 border-t border-indigo-200 dark:border-indigo-800/40 flex items-center justify-between text-[11px] font-bold text-indigo-600">
                    <span>👉 Click a staff member to assign</span>
                    <button onClick={(e) => { e.stopPropagation(); setActiveItemForAssignment(null); }} className="text-zinc-400 hover:text-zinc-600">Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Shift Roster & Staff Availability */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <UserCheck size={14} className="text-emerald-500" />
              <span>{selectedDay} Roster &amp; Staff Availability</span>
            </h3>
            <span className="text-xs font-semibold text-zinc-400">
              {filteredMembers.filter(m => !m.leaveStatus.isOnLeave && m.shifts[selectedDay] !== 'Off').length} On-Duty
            </span>
          </div>

          <div className="space-y-3">
            {filteredMembers.map(member => {
              const shift = member.shifts[selectedDay] || '08:00 - 16:30';
              const isOff = shift === 'Off' || shift.includes('Off');
              const hasExpiredCert = member.certifications.some(c => c.isExpired);

              return (
                <div
                  key={member.id}
                  onClick={() => activeItemForAssignment && handleAssignWorker(member)}
                  className={`p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                    activeItemForAssignment
                      ? 'hover:border-indigo-500 hover:bg-indigo-50/20 cursor-pointer ring-1 ring-transparent hover:ring-indigo-500/20'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-600 text-xs">
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.name} className="w-full h-full rounded-2xl object-cover" />
                      ) : (
                        member.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-zinc-900 dark:text-white">{member.name}</h4>
                        <span className="text-[10px] font-semibold text-zinc-400">({member.position})</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {member.leaveStatus.isOnLeave ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                            <UserX size={10} /> On {member.leaveStatus.leaveType}
                          </span>
                        ) : isOff ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                            Scheduled Off
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <Clock size={10} /> Shift: {shift}
                          </span>
                        )}

                        {hasExpiredCert && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
                            <AlertTriangle size={10} /> Expired Safety Cert
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Certifications and Skills Tags */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {member.certifications.map(c => (
                      <span
                        key={c.id}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${
                          c.isExpired
                            ? 'bg-rose-500/10 text-rose-500 border-rose-500/30 line-through'
                            : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                        }`}
                        title={c.isExpired ? `Expired on ${c.expiryDate}` : `Valid until ${c.expiryDate}`}
                      >
                        <Award size={10} />
                        <span>{c.name}</span>
                      </span>
                    ))}
                  </div>

                  {/* Dispatch Action Button if in selection mode */}
                  {activeItemForAssignment && (
                    <button
                      onClick={() => handleAssignWorker(member)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shrink-0"
                    >
                      Assign Job
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
export default ResourceDispatchBoard;
