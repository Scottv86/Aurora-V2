import { useState } from 'react';
import { Select } from '../../UI/Primitives';
import { Globe2, Clock, Banknote, Calendar } from 'lucide-react';

interface RegionalSettingsProps {
  tenant: any;
  onUpdate: (updates: any) => Promise<void>;
}

export const RegionalSettings = ({ tenant, onUpdate }: RegionalSettingsProps) => {
  const [localization, setLocalization] = useState({
    timezone: tenant?.localization?.timezone || 'UTC',
    currency: tenant?.localization?.currency || 'USD',
    language: tenant?.localization?.language || 'en',
    dateFormat: tenant?.localization?.dateFormat || 'DD/MM/YYYY',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate({
      localization: {
        ...localization
      }
    });
  };

  return (
    <form id="org-settings-form" onSubmit={handleSubmit} className="w-full space-y-6">
      <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200/80 dark:border-white/5 rounded-3xl p-6 lg:p-8 shadow-xl shadow-black/5 dark:shadow-none space-y-8">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider font-mono">Localization & Regional Standards</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Configure timezone defaults, primary currency, date formats, and language settings.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Select 
            label="System Timezone" 
            value={localization.timezone}
            onChange={(e) => setLocalization(prev => ({ ...prev, timezone: e.target.value }))}
            icon={<Clock size={18} />}
            options={[
              { label: '(UTC+00:00) London', value: 'Europe/London' },
              { label: '(UTC+01:00) Berlin', value: 'Europe/Berlin' },
              { label: '(UTC+05:30) Mumbai', value: 'Asia/Kolkata' },
              { label: '(UTC+08:00) Perth', value: 'Australia/Perth' },
              { label: '(UTC+10:00) Sydney', value: 'Australia/Sydney' },
              { label: '(UTC-05:00) New York', value: 'America/New_York' },
              { label: '(UTC-08:00) Los Angeles', value: 'America/Los_Angeles' },
            ]}
          />

          <Select 
            label="Primary Currency" 
            value={localization.currency}
            onChange={(e) => setLocalization(prev => ({ ...prev, currency: e.target.value }))}
            icon={<Banknote size={18} />}
            options={[
              { label: 'USD - US Dollar ($)', value: 'USD' },
              { label: 'AUD - Australian Dollar ($)', value: 'AUD' },
              { label: 'EUR - Euro (€)', value: 'EUR' },
              { label: 'GBP - British Pound (£)', value: 'GBP' },
              { label: 'SGD - Singapore Dollar ($)', value: 'SGD' },
            ]}
          />

          <Select 
            label="System Language" 
            value={localization.language}
            onChange={(e) => setLocalization(prev => ({ ...prev, language: e.target.value }))}
            icon={<Globe2 size={18} />}
            options={[
              { label: 'English (US)', value: 'en-US' },
              { label: 'English (UK/AU)', value: 'en-GB' },
              { label: 'German', value: 'de' },
              { label: 'Spanish', value: 'es' },
              { label: 'French', value: 'fr' },
            ]}
          />

          <Select 
            label="Date Format" 
            value={localization.dateFormat}
            onChange={(e) => setLocalization(prev => ({ ...prev, dateFormat: e.target.value }))}
            icon={<Calendar size={18} />}
            options={[
              { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
              { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
              { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
              { label: 'MMM D, YYYY', value: 'MMM D, YYYY' },
            ]}
          />
        </div>
      </div>
    </form>
  );
};
