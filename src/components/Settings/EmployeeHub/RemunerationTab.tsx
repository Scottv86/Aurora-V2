import React, { useState } from 'react';
import { 
  DollarSign, 
  Eye, 
  EyeOff, 
  Download, 
  ShieldCheck, 
  FileText, 
  Calendar, 
  Building2, 
  CheckCircle2, 
  CreditCard,
  Lock,
  ArrowUpRight
} from 'lucide-react';
import { MemberHRData } from './types';
import { toast } from 'sonner';

interface RemunerationTabProps {
  hrData: MemberHRData;
}

export const RemunerationTab: React.FC<RemunerationTabProps> = ({ hrData }) => {
  const [showMasked, setShowMasked] = useState(false);

  const activeContract = hrData.contracts[0];
  const activeRemuneration = activeContract?.remuneration?.[0];
  const annualBase = activeRemuneration?.amount || 115000;
  const currency = activeRemuneration?.currency || 'AUD';

  // Calculations
  const fortnightlyGross = annualBase / 26;
  const estimatedTaxFortnight = fortnightlyGross * 0.28; // Estimated PAYG
  const estimatedNetFortnight = fortnightlyGross - estimatedTaxFortnight;
  const superRate = 0.115; // 11.5%
  const annualSuper = annualBase * superRate;

  // Masking helper
  const mask = (val: string | number) => {
    if (showMasked) return val;
    return '$••••••';
  };

  const handleDownloadPayslip = (dateStr: string) => {
    toast.success(`Generated official PDF payslip for ${dateStr}. Download starting...`);
  };

  const payslips = [
    { period: '24 Oct 2026 – 06 Nov 2026', payDate: '06 Nov 2026', gross: fortnightlyGross, tax: estimatedTaxFortnight, net: estimatedNetFortnight },
    { period: '10 Oct 2026 – 23 Oct 2026', payDate: '23 Oct 2026', gross: fortnightlyGross, tax: estimatedTaxFortnight, net: estimatedNetFortnight },
    { period: '26 Sep 2026 – 09 Oct 2026', payDate: '09 Oct 2026', gross: fortnightlyGross, tax: estimatedTaxFortnight, net: estimatedNetFortnight }
  ];

  return (
    <div className="space-y-6 w-full">
      {/* Header with Privacy Mask Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <DollarSign size={18} className="text-emerald-500" />
            Remuneration, Payslips & Benefits
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Secure, privacy-shielded view of your employment compensation package and payslip vault.
          </p>
        </div>

        <button
          onClick={() => setShowMasked(!showMasked)}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto shadow-sm"
        >
          {showMasked ? <EyeOff size={15} /> : <Eye size={15} />}
          {showMasked ? 'Hide Sensitive Values' : 'Reveal Values'}
        </button>
      </div>

      {/* Main Salary & Superannuation Snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
        
        {/* Base Salary */}
        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span className="font-semibold">Annual Base Salary</span>
            <Lock size={14} className="text-zinc-400" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white">
            {mask(`$${annualBase.toLocaleString()} ${currency}`)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-200/50 dark:border-zinc-800/50">
            <span>Cycle: Fortnightly</span>
            <span className="text-emerald-500 font-medium">Permanent Full-Time</span>
          </div>
        </div>

        {/* Fortnightly Take-Home */}
        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span className="font-semibold">Est. Fortnightly Take-Home</span>
            <CreditCard size={14} className="text-zinc-400" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-emerald-500">
            {mask(`$${estimatedNetFortnight.toFixed(2)}`)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-200/50 dark:border-zinc-800/50">
            <span>Gross: {mask(`$${fortnightlyGross.toFixed(2)}`)}</span>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Next: 20 Nov 2026</span>
          </div>
        </div>

        {/* Superannuation / Pension */}
        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span className="font-semibold">Superannuation (11.5%)</span>
            <ShieldCheck size={14} className="text-zinc-400" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white">
            {mask(`$${annualSuper.toLocaleString()} / yr`)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-200/50 dark:border-zinc-800/50">
            <span>Fund: AustralianSuper</span>
            <span className="text-indigo-400 font-medium">Compliant</span>
          </div>
        </div>

      </div>

      {/* 2-Column Responsive Split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full items-start">
        {/* Left Column (8 cols): Payslip Vault */}
        <div className="xl:col-span-8 p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
              <FileText size={14} className="text-emerald-500" />
              Official Payslip Archive
            </h3>
            <span className="text-[11px] text-zinc-400">
              Verified by Aurora Payroll Service
            </span>
          </div>

          <div className="space-y-2.5">
            {payslips.map((slip, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-emerald-500/40 transition-colors"
              >
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">
                    Period: {slip.period}
                  </span>
                  <p className="text-[11px] text-zinc-500">
                    Disbursed on {slip.payDate} • Direct Bank Transfer (Verified)
                  </p>
                </div>

                <div className="flex items-center gap-6 self-end sm:self-auto">
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 uppercase">Net Disbursed</span>
                    <p className="text-xs font-bold font-mono text-emerald-500">
                      {mask(`$${slip.net.toFixed(2)}`)}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDownloadPayslip(slip.payDate)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 transition-colors flex items-center gap-1.5"
                  >
                    <Download size={13} />
                    PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (4 cols): Tax & Deductions Breakdown */}
        <div className="xl:col-span-4 p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
            <Building2 size={14} className="text-indigo-500" />
            Taxation & Super Summary
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-zinc-200/60 dark:border-zinc-800/60">
              <span className="text-zinc-500">Gross Fortnightly</span>
              <span className="font-mono font-semibold text-zinc-900 dark:text-white">{mask(`$${fortnightlyGross.toFixed(2)}`)}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-zinc-200/60 dark:border-zinc-800/60">
              <span className="text-zinc-500">PAYG Withholding (~28%)</span>
              <span className="font-mono font-semibold text-red-400">{mask(`-$${estimatedTaxFortnight.toFixed(2)}`)}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-zinc-200/60 dark:border-zinc-800/60">
              <span className="text-zinc-500">Employer Super Contribution</span>
              <span className="font-mono font-semibold text-emerald-400">{mask(`+$${(annualSuper / 26).toFixed(2)}`)}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-zinc-500">Net Take-Home Pay</span>
              <span className="font-mono font-bold text-emerald-500">{mask(`$${estimatedNetFortnight.toFixed(2)}`)}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 space-y-1">
            <div><strong className="text-zinc-700 dark:text-zinc-300">Super Member ID:</strong> AUS-94827103</div>
            <div><strong className="text-zinc-700 dark:text-zinc-300">Tax File Declaration:</strong> Lodged with ATO</div>
          </div>
        </div>
      </div>

      {/* Company Benefits & Allowances Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
        <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-500/20 space-y-1.5">
          <span className="text-xs font-bold text-indigo-400">L&D Training Budget</span>
          <p className="text-sm font-bold text-zinc-900 dark:text-white">$2,500 / year</p>
          <p className="text-xs text-zinc-500">For conferences, technical certifications, and courses.</p>
        </div>

        <div className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-1.5">
          <span className="text-xs font-bold text-emerald-400">Wellness Allowance</span>
          <p className="text-sm font-bold text-zinc-900 dark:text-white">$600 / year</p>
          <p className="text-xs text-zinc-500">Gym memberships, health subscriptions, and fitness gear.</p>
        </div>

        <div className="p-5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-500/20 space-y-1.5">
          <span className="text-xs font-bold text-purple-400">Hardware & Desk Refresh</span>
          <p className="text-sm font-bold text-zinc-900 dark:text-white">$800 / biennial</p>
          <p className="text-xs text-zinc-500">Monitors, mechanical keyboards, chairs, and home peripherals.</p>
        </div>
      </div>
    </div>
  );
};
