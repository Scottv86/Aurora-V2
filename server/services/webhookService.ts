import { globalPrisma } from '../lib/prisma';

/**
 * Fires outgoing webhooks asynchronously for active tenant subscriptions.
 */
export async function triggerWebhooks(tenantId: string, eventType: string, payload: any) {
  try {
    const subscriptions = await globalPrisma.webhookSubscription.findMany({
      where: {
        tenantId,
        isActive: true
      }
    });

    for (const sub of subscriptions) {
      const eventTypes = Array.isArray(sub.eventTypes) ? sub.eventTypes : [];
      if (eventTypes.includes(eventType) || eventTypes.includes('*')) {
        console.log(`[WebhookService] Triggering webhook for subscription "${sub.name}" (${sub.id}) - Event: ${eventType}`);
        
        fetch(sub.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-aurora-event': eventType,
            'x-aurora-signature': sub.secret || ''
          },
          body: JSON.stringify({
            event: eventType,
            timestamp: new Date().toISOString(),
            data: payload
          })
        }).catch((err: any) => {
          console.error(`[WebhookService] Webhook delivery failed for ${sub.url}:`, err.message || err);
        });
      }
    }
  } catch (err) {
    console.error('[WebhookService] Error executing triggerWebhooks:', err);
  }
}
