import React from 'react';
import { usePlatform } from '../../../hooks/usePlatform';
import { PaymentGatewaysTab } from '../../../components/Platform/Payments/PaymentGatewaysTab';
import { CreditCard, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/UI/PageHeader';
import { Button } from '../../../components/UI/Primitives';

export const PaymentGatewaysPage: React.FC = () => {
  const { tenant } = usePlatform();
  const navigate = useNavigate();

  if (!tenant?.id) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-zinc-50/50 dark:bg-zinc-950/50 text-zinc-500 dark:text-zinc-400 text-sm">
        Loading workspace context...
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full relative min-h-[calc(100vh-4rem)] bg-zinc-50/50 dark:bg-zinc-950/50 overflow-y-auto">
      {/* Standardized Header */}
      <PageHeader
        title={
          <div className="flex items-center gap-2.5">
            <span>Payment Gateways & Hardware Terminals</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase font-bold">
              Universal Acquirer Hub
            </span>
          </div>
        }
        description="Configure third-party payment gateways, bank merchant accounts, EFTPOS card readers, and webhooks across POS, Invoices, and Online Portals."
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate('/workspace/settings/platform-modules/transactions')}
              className="h-9 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>View Transactions Ledger</span>
            </Button>
          </div>
        }
      />

      {/* Main Content */}
      <div className="flex-1 px-6 lg:px-12 pt-6 pb-20 relative z-10">
        <PaymentGatewaysTab tenantId={tenant.id} />
      </div>
    </div>
  );
};

export default PaymentGatewaysPage;
