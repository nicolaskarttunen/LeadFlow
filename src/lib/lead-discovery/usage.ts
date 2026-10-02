import prisma from "@/lib/prisma";

export const GOOGLE_PLACES_TEXT_SEARCH_MONTHLY_LIMIT = 4500;
const METRIC = "google_places_text_search_requests";

function currentPeriodStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function reserveGooglePlacesTextSearch(workspaceId: string) {
  const periodStart = currentPeriodStart();

  return prisma.$transaction(async (tx) => {
    const current = await tx.usageRecord.findUnique({
      where: {
        workspaceId_periodStart_metric: {
          workspaceId,
          periodStart,
          metric: METRIC,
        },
      },
    });

    const used = current?.quantity ?? 0;
    if (used >= GOOGLE_PLACES_TEXT_SEARCH_MONTHLY_LIMIT) {
      throw new Error(
        `Google Places monthly safety limit reached (${GOOGLE_PLACES_TEXT_SEARCH_MONTHLY_LIMIT} searches). New searches are paused until next month.`
      );
    }

    await tx.usageRecord.upsert({
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
    });

    return {
      used: used + 1,
      limit: GOOGLE_PLACES_TEXT_SEARCH_MONTHLY_LIMIT,
      remaining: GOOGLE_PLACES_TEXT_SEARCH_MONTHLY_LIMIT - used - 1,
    };
  });
}

export async function getGooglePlacesTextSearchUsage(workspaceId: string) {
  const periodStart = currentPeriodStart();
  const record = await prisma.usageRecord.findUnique({
    where: {
      workspaceId_periodStart_metric: {
        workspaceId,
        periodStart,
        metric: METRIC,
      },
    },
    select: { quantity: true },
  });

  const used = record?.quantity ?? 0;
  return {
    used,
    limit: GOOGLE_PLACES_TEXT_SEARCH_MONTHLY_LIMIT,
    remaining: Math.max(0, GOOGLE_PLACES_TEXT_SEARCH_MONTHLY_LIMIT - used),
  };
}
