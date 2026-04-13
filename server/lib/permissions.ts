import { globalPrisma } from './prisma';

/**
 * Recursively resolves all capabilities for a set of group IDs,
 * including those inherited from parent groups.
 */
export const resolveCapabilities = async (groupIds: string[], tenantId: string): Promise<string[]> => {
  if (!groupIds.length) return [];

  const capabilities = new Set<string>();
  const processedGroups = new Set<string>();
  let groupsToProcess = [...groupIds];

  while (groupsToProcess.length > 0) {
    const currentBatch = groupsToProcess.filter(id => !processedGroups.has(id));
    if (currentBatch.length === 0) break;

    const groups = await globalPrisma.permissionGroup.findMany({
      where: { 
        id: { in: currentBatch },
        tenantId: tenantId
      },
      select: {
        id: true,
        capabilities: true,
        parentGroupId: true
      }
    });

    groups.forEach(g => {
      processedGroups.add(g.id);
      
      // Add group's own capabilities
      const caps = g.capabilities as string[] || [];
      caps.forEach(c => capabilities.add(c));
      
      // Add parent to the queue if it exists and hasn't been processed
      if (g.parentGroupId && !processedGroups.has(g.parentGroupId)) {
        groupsToProcess.push(g.parentGroupId);
      }
    });

    // Remove the batch we just processed
    groupsToProcess = groupsToProcess.filter(id => !processedGroups.has(id));
  }

  return Array.from(capabilities);
};
