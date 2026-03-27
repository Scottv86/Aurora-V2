import { 
  Users, 
  UserPlus, 
  Search, 
  MoreVertical, 
  Mail, 
  Phone, 
  Shield, 
  CheckCircle2,
  Clock,
  Filter
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { usePlatform } from '../hooks/usePlatform';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';

export const People = () => {
  const { tenant } = usePlatform();
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant?.id) {
      setLoading(false);
      return;
    }
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('tenantId', '==', tenant.id), orderBy('lastActive', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      setPeople(usersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">People</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage users, roles, and permissions within your workspace.</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20">
          <UserPlus size={18} />
          <span>Invite Member</span>
        </button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-900 dark:text-zinc-300 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors">
          <Filter size={16} />
          <span>Filter</span>
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <th className="py-4 px-6 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">User</th>
              <th className="py-4 px-6 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Role</th>
              <th className="py-4 px-6 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status</th>
              <th className="py-4 px-6 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Last Active</th>
              <th className="py-4 px-6 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {people.map((person, i) => (
              <motion.tr 
                key={person.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
              >
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                      {person.displayName ? person.displayName.split(' ').map((n: any) => n[0]).join('') : '??'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">{person.displayName || 'Unknown User'}</p>
                      <p className="text-xs text-zinc-500">{person.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <Shield size={14} className="text-zinc-400 dark:text-zinc-500" />
                    <span className="text-sm text-zinc-600 dark:text-zinc-300 capitalize">{person.role}</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-sm text-zinc-600 dark:text-zinc-300">Active</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <Clock size={14} />
                    <span className="text-xs">
                      {person.lastActive?.toDate ? person.lastActive.toDate().toLocaleString() : 'Just now'}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6 text-right">
                  <button className="p-2 text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-colors">
                    <MoreVertical size={18} />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
