import { globalPrisma as db } from '../server/lib/prisma';

async function backfill() {
  const tenants = await db.tenant.findMany();
  let count = 0;
  for (const t of tenants) {
    const orders = await (db as any).posOrder.findMany({
      where: { tenantId: t.id },
      include: { payments: true, transactions: true }
    });
    for (const o of orders) {
      if (!o.transactions || o.transactions.length === 0) {
        const primaryPayment = o.payments[0];
        const dateStr = new Date(o.createdAt).toISOString().slice(0, 10).replace(/-/g, '');
        const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        await (db as any).paymentTransaction.create({
          data: {
            tenantId: t.id,
            transactionRef: `TXN-${dateStr}-${randomCode}`,
            channel: 'POS',
            type: o.status === 'REFUNDED' ? 'REFUND' : 'SALE',
            status: o.status === 'REFUNDED' ? 'REFUNDED' : 'SUCCEEDED',
            grossAmount: o.total,
            taxAmount: o.taxTotal,
            netAmount: o.total,
            paymentMethod: primaryPayment ? primaryPayment.tenderType : 'CASH',
            customerPartyId: o.customerPartyId,
            posOrderId: o.id,
            journalEntryId: o.journalEntryId,
            createdAt: o.createdAt
          }
        });
        count++;
      }
    }

    const invoices = await (db as any).invoice.findMany({
      where: { tenantId: t.id },
      include: { payments: true, transactions: true }
    });
    for (const inv of invoices) {
      for (const p of inv.payments) {
        const dateStr = new Date(p.paymentDate).toISOString().slice(0, 10).replace(/-/g, '');
        const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        await (db as any).paymentTransaction.create({
          data: {
            tenantId: t.id,
            transactionRef: `TXN-${dateStr}-${randomCode}`,
            channel: 'INVOICE',
            type: 'SALE',
            status: 'SUCCEEDED',
            grossAmount: p.amount,
            netAmount: p.amount,
            paymentMethod: p.paymentMethod || 'BANK_TRANSFER',
            customerPartyId: inv.customerPartyId,
            invoiceId: inv.id,
            journalEntryId: p.journalEntryId,
            createdAt: p.paymentDate
          }
        });
        count++;
      }
    }
  }
  console.log(`Backfill completed. Seeded ${count} transactions.`);
}

backfill()
  .catch(console.error)
  .finally(() => process.exit(0));
