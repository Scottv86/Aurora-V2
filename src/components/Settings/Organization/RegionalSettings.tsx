import { useState } from 'react';
import { Button, Select } from '../../UI/Primitives';
import { Globe2, Clock, Banknote, Calendar } from 'lucide-react';

interface RegionalSettingsProps {
  tenant: any;
  onUpdate: (updates: any) => Promise<void>;
}

export const RegionalSettings = ({ tenant, onUpdate }: RegionalSettingsProps) => {
  const [loading, setLoading] = useState(false);
  const [localization, setLocalization] = useState({
    timezone: tenant?.localization?.timezone || 'UTC',
    currency: tenant?.localization?.currency || 'USD',
    language: tenant?.localization?.language || 'en',
    dateFormat: tenant?.localization?.dateFormat || 'DD/MM/YYYY',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onUpdate({
        localization: {
          ...localization
        }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-12">
      <div className="space-y-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white uppercase tracking-tight">Regional Settings</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Configure how dates, times, and currencies are displayed across the platform.
            </p>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
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
      </div>

      <div className="flex items-center justify-end pt-8 border-t border-zinc-200 dark:border-zinc-800">
        <Button 
          type="submit" 
          variant="primary" 
          loading={loading}
          className="gap-2 px-8 font-bold shadow-lg shadow-blue-500/20"
        >
          <Globe2 size={18} /> Save Regional Preferences
        </Button>
      </div>
    </form>
  );
};
