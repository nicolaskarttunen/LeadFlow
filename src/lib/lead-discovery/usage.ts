import prisma from "@/lib/prisma";

export const GOOGLE_PLACES_TEXT_SEARCH_GLOBAL_MONTHLY_LIMIT = 4500;
const METRIC = "google_places_text_search_requests";

function currentPeriodStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function reserveGooglePlacesTextSearch(workspaceId: string) {
  const periodStart = currentPeriodStart();

  return prisma.$transaction(async (tx) => {
    const aggregate = await tx.usageRecord.aggregate({
      where: { periodStart, metric: METRIC },
      _sum: { quantity: true },
    });
    const globalUsed = aggregate._sum.quantity ?? 0;

    if (globalUsed >= GOOGLE_PLACES_TEXT_SEARCH_GLOBAL_MONTHLY_LIMIT) {
      throw new Error(
        `Google Places monthly safety limit reached (${GOOGLE_PLACES_TEXT_SEARCH_GLOBAL_MONTHLY_LIMIT} searches across LeadFlow). New searches are paused until next month.`
      );
    }

    const workspaceRecord = await tx.usageRecord.upsert({
      where: {
        workspaceId_periodStart_metric: {
          workspaceId,
          periodStart,
          metric: METRIC,
        },
      },
      create: {
        workspaceId,
        periodStart,
        metric: METRIC,
        quantity: 1,
      },
      update: {
        quantity: { increment: 1 },
      },
      select: { quantity: true },
    });

    return {
      globalUsed: globalUsed + 1,
      globalLimit: GOOGLE_PLACES_TEXT_SEARCH_GLOBAL_MONTHLY_LIMIT,
      globalRemaining: GOOGLE_PLACES_TEXT_SEARCH_GLOBAL_MONTHLY_LIMIT - globalUsed - 1,
      workspaceUsed: workspaceRecord.quantity,
    };
  });
}

export async function getGooglePlacesTextSearchUsage(workspaceId: string) {
  const periodStart = currentPeriodStart();

  const [workspaceRecord, aggregate] = await Promise.all([
    prisma.usageRecord.findUnique({
      where: {
        workspaceId_periodStart_metric: {
          workspaceId,
          periodStart,
          metric: METRIC,
        },
      },
      select: { quantity: true },
    }),
    prisma.usageRecord.aggregate({
      where: { periodStart, metric: METRIC },
      _sum: { quantity: true },
    }),
  ]);

  const workspaceUsed = workspaceRecord?.quantity ?? 0;
  const globalUsed = aggregate._sum.quantity ?? 0;

  return {
    workspaceUsed,
    globalUsed,
    globalLimit: GOOGLE_PLACES_TEXT_SEARCH_GLOBAL_MONTHLY_LIMIT,
    globalRemaining: Math.max(0, GOOGLE_PLACES_TEXT_SEARCH_GLOBAL_MONTHLY_LIMIT - globalUsed),
  };
}
