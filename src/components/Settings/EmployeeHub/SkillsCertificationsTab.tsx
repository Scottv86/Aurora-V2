import React, { useState } from 'react';
import { 
  Award, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Plus, 
  X, 
  ExternalLink,
  ShieldCheck,
  BookOpen
} from 'lucide-react';
import { MemberHRData } from './types';
import { toast } from 'sonner';

interface SkillsCertificationsTabProps {
  hrData: MemberHRData;
}

export const SkillsCertificationsTab: React.FC<SkillsCertificationsTabProps> = ({ hrData }) => {
  const [certs, setCerts] = useState(hrData.member.certifications || [
    { id: 'c1', name: 'AWS Certified Solutions Architect', issuer: 'Amazon Web Services', issueDate: '2025-01-15', expiryDate: '2027-01-15' },
    { id: 'c2', name: 'Certified Kubernetes Administrator (CKA)', issuer: 'Linux Foundation', issueDate: '2024-08-10', expiryDate: '2026-08-10' }
  ]);

  const skills = hrData.member.skills || [
    { id: 's1', name: 'Distributed Systems', level: 'Expert' },
    { id: 's2', name: 'TypeScript & React', level: 'Advanced' },
    { id: 's3', name: 'PostgreSQL & Prisma', level: 'Advanced' },
    { id: 's4', name: 'Cloud Infrastructure (AWS/GCP)', level: 'Proficient' },
    { id: 's5', name: 'AI & LLM Orchestration', level: 'Advanced' }
  ];

  const [showAddModal, setShowAddModal] = useState(false);
  const [certName, setCertName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const handleAddCert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!certName) return;

    const newCert = {
      id: `c_${Date.now()}`,
      name: certName,
      issuer: issuer || 'Accredited Authority',
      issueDate: issueDate || new Date().toISOString().split('T')[0],
      expiryDate: expiryDate || '2028-12-31'
    };

    setCerts(prev => [newCert, ...prev]);
    toast.success('Certification credential recorded to workforce profile');
    setShowAddModal(false);
    setCertName('');
    setIssuer('');
    setIssueDate('');
    setExpiryDate('');
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Award size={18} className="text-purple-500" />
            Skills, Certifications & Credentials
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Professional credentials, security clearances, technical capabilities, and compliance renewal dates.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
        >
          <Plus size={16} />
          Add Credential
        </button>
      </div>

      {/* Add Credential Modal Drawer */}
      {showAddModal && (
        <div className="p-6 rounded-2xl bg-purple-50/40 dark:bg-zinc-900/90 border border-purple-500/30 shadow-2xl space-y-4 w-full">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Add Professional Credential</h3>
            <button
              onClick={() => setShowAddModal(false)}
              className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleAddCert} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Credential Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AWS Certified DevOps Engineer"
                  value={certName}
                  onChange={(e) => setCertName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Issuing Organization
                </label>
                <input
                  type="text"
                  placeholder="e.g. Amazon Web Services, Scrum Alliance"
                  value={issuer}
                  onChange={(e) => setIssuer(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Date of Issue
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Expiry / Renewal Date
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition-all"
              >
                Save Credential
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Certifications List */}
      <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
            <ShieldCheck size={14} className="text-purple-500" />
            Active Certifications & Badges ({certs.length})
          </h3>
          <span className="text-[11px] text-zinc-400">
            Validated by Aurora Workforce Registry
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
          {certs.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 flex items-start justify-between gap-3"
            >
              <div className="space-y-1">
                <span className="text-xs font-bold text-zinc-900 dark:text-white">
                  {c.name}
                </span>
                <p className="text-[11px] text-zinc-500">
                  Issued by {c.issuer || 'Accredited Body'}
                </p>
                <div className="flex items-center gap-3 text-[10px] text-zinc-400 pt-1">
                  <span>Issued: {c.issueDate || 'Recent'}</span>
                  <span>Expires: <strong className="text-indigo-400">{c.expiryDate || 'Active'}</strong></span>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                Verified
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Technical Capabilities & Competency Matrix */}
      <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
            <BookOpen size={14} className="text-indigo-500" />
            Skills & Endorsed Competencies
          </h3>
          <span className="text-[11px] text-zinc-400">
            Mapped for project assignments & dispatch
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {skills.map((s) => (
            <div
              key={s.id}
              className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 flex items-center gap-2"
            >
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-200">
                {s.name}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                s.level === 'Expert'
                  ? 'bg-purple-500/10 text-purple-400'
                  : s.level === 'Advanced'
                  ? 'bg-indigo-500/10 text-indigo-400'
                  : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-400'
              }`}>
                {s.level}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
