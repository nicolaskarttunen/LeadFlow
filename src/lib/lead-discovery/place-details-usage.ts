import prisma from "@/lib/prisma";

export const GOOGLE_PLACES_DETAILS_GLOBAL_MONTHLY_LIMIT = 900;
const METRIC = "google_places_place_details_enterprise_requests";

function currentPeriodStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function reserveGooglePlacesDetails(workspaceId: string) {
  const periodStart = currentPeriodStart();

  return prisma.$transaction(async (tx) => {
    const aggregate = await tx.usageRecord.aggregate({
      where: { periodStart, metric: METRIC },
      _sum: { quantity: true },
    });
    const globalUsed = aggregate._sum.quantity ?? 0;

    if (globalUsed >= GOOGLE_PLACES_DETAILS_GLOBAL_MONTHLY_LIMIT) {
      throw new Error("Google Places enrichment safety limit reached for this month.");
    }

    const workspaceRecord = await tx.usageRecord.upsert({
      where: {
        workspaceId_periodStart_metric: { workspaceId, periodStart, metric: METRIC },
      },
      create: { workspaceId, periodStart, metric: METRIC, quantity: 1 },
      update: { quantity: { increment: 1 } },
      select: { quantity: true },
    });

    return {
      globalUsed: globalUsed + 1,
      globalLimit: GOOGLE_PLACES_DETAILS_GLOBAL_MONTHLY_LIMIT,
      workspaceUsed: workspaceRecord.quantity,
    };
  });
}
