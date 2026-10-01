-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('MANUAL', 'CSV', 'MOCK', 'PROVIDER');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'QUALIFIED', 'CONTACTED', 'REPLIED', 'POSITIVE', 'MEETING', 'DISQUALIFIED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EmailVerificationStatus" AS ENUM ('UNKNOWN', 'VALID', 'INVALID', 'RISKY', 'CATCH_ALL');

-- CreateEnum
CREATE TYPE "ResearchStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETE', 'FAILED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CampaignLeadStatus" AS ENUM ('PENDING', 'READY', 'ACTIVE', 'PAUSED', 'REPLIED', 'COMPLETED', 'REMOVED');

-- CreateEnum
CREATE TYPE "EmailDraftStatus" AS ENUM ('DRAFT', 'NEEDS_REVIEW', 'APPROVED', 'SCHEDULED', 'SENT', 'REPLIED', 'PAUSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EmailDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "EmailMessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'BOUNCED', 'COMPLAINED', 'FAILED', 'REPLIED');

-- CreateEnum
CREATE TYPE "EmailEventType" AS ENUM ('SENT', 'DELIVERED', 'BOUNCED', 'COMPLAINED', 'CLICKED', 'OPENED', 'REPLIED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReplyCategory" AS ENUM ('INTERESTED', 'MAYBE_LATER', 'NOT_INTERESTED', 'QUESTION', 'UNSUBSCRIBE', 'OUT_OF_OFFICE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "SuppressionReason" AS ENUM ('UNSUBSCRIBED', 'BOUNCED', 'COMPLAINT', 'INVALID_EMAIL', 'MANUAL');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETE', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('EMAIL', 'AI', 'LEAD_DISCOVERY', 'CONTACT_ENRICHMENT', 'EMAIL_VERIFICATION', 'WEBSITE_AUDIT');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sendingPaused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "website" TEXT,
    "description" TEXT,
    "offering" TEXT,
    "idealCustomer" TEXT,
    "industries" TEXT[],
    "regions" TEXT[],
    "companySize" TEXT,
    "keywords" TEXT[],
    "exclusions" TEXT[],
    "emailTone" TEXT NOT NULL DEFAULT 'Professional',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdealCustomerProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetCustomer" TEXT,
    "industries" TEXT[],
    "regions" TEXT[],
    "companySize" TEXT,
    "keywords" TEXT[],
    "excludedIndustries" TEXT[],
    "excludedCompanies" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdealCustomerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyNameNormalized" TEXT NOT NULL,
    "domain" TEXT,
    "domainNormalized" TEXT,
    "domainKey" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "location" TEXT,
    "companySize" TEXT,
    "description" TEXT,
    "linkedinUrl" TEXT,
    "source" "LeadSource" NOT NULL DEFAULT 'MANUAL',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "whyRelevant" TEXT,
    "potentialService" TEXT,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "name" TEXT,
    "jobTitle" TEXT,
    "email" TEXT,
    "emailNormalized" TEXT,
    "emailKey" TEXT,
    "emailVerificationStatus" "EmailVerificationStatus" NOT NULL DEFAULT 'UNKNOWN',
    "linkedinUrl" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadScore" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "confidence" INTEGER,
    "breakdown" JSONB NOT NULL,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchRecord" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "status" "ResearchStatus" NOT NULL DEFAULT 'PENDING',
    "companySummary" TEXT,
    "likelyCustomers" TEXT,
    "onlinePresence" TEXT,
    "opportunities" TEXT,
    "relevantServices" TEXT[],
    "doNotClaim" TEXT[],
    "confidence" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteAudit" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "status" "ResearchStatus" NOT NULL DEFAULT 'PENDING',
    "url" TEXT NOT NULL,
    "httpsEnabled" BOOLEAN,
    "pageTitle" TEXT,
    "metaDescription" TEXT,
    "h1" TEXT,
    "mobileNotes" TEXT,
    "ctaNotes" TEXT,
    "seoNotes" TEXT,
    "performanceData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchEvidence" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "researchRecordId" TEXT,
    "websiteAuditId" TEXT,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceExcerpt" TEXT,
    "confidence" INTEGER,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "targetProfile" TEXT,
    "maximumLeads" INTEGER,
    "minimumLeadScore" INTEGER,
    "dailySendingLimit" INTEGER NOT NULL DEFAULT 20,
    "sendingDays" TEXT[],
    "sendingWindowStart" TEXT,
    "sendingWindowEnd" TEXT,
    "senderName" TEXT,
    "senderEmail" TEXT,
    "emailTone" TEXT NOT NULL DEFAULT 'Professional',
    "followUpConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignLead" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "status" "CampaignLeadStatus" NOT NULL DEFAULT 'PENDING',
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailDraft" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "campaignId" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "EmailDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "personalizationExplanation" TEXT,
    "factsUsed" JSONB,
    "confidence" INTEGER,
    "scheduledFor" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "contactId" TEXT,
    "campaignId" TEXT,
    "draftId" TEXT,
    "direction" "EmailDirection" NOT NULL,
    "status" "EmailMessageStatus" NOT NULL,
    "providerMessageId" TEXT,
    "idempotencyKey" TEXT,
    "fromEmail" TEXT,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "sentAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "type" "EmailEventType" NOT NULL,
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reply" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "messageId" TEXT,
    "leadId" TEXT NOT NULL,
    "contactId" TEXT,
    "campaignId" TEXT,
    "category" "ReplyCategory" NOT NULL DEFAULT 'UNKNOWN',
    "body" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuppressionEntry" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "reason" "SuppressionReason" NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuppressionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "runAt" TIMESTAMP(3) NOT NULL,
    "payload" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderConnection" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "ProviderType" NOT NULL,
    "providerName" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "publicConfig" JSONB,
    "secretReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'Starter',
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "quotas" JSONB,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "metric" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "account_providerId_accountId_idx" ON "account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_createdAt_idx" ON "WorkspaceMember"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProfile_workspaceId_key" ON "CompanyProfile"("workspaceId");

-- CreateIndex
CREATE INDEX "IdealCustomerProfile_workspaceId_active_idx" ON "IdealCustomerProfile"("workspaceId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_domainKey_key" ON "Lead"("domainKey");

-- CreateIndex
CREATE INDEX "Lead_workspaceId_domainNormalized_idx" ON "Lead"("workspaceId", "domainNormalized");

-- CreateIndex
CREATE INDEX "Lead_workspaceId_companyNameNormalized_idx" ON "Lead"("workspaceId", "companyNameNormalized");

-- CreateIndex
CREATE INDEX "Lead_workspaceId_status_idx" ON "Lead"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Lead_workspaceId_discoveredAt_idx" ON "Lead"("workspaceId", "discoveredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_emailKey_key" ON "Contact"("emailKey");

-- CreateIndex
CREATE INDEX "Contact_workspaceId_emailNormalized_idx" ON "Contact"("workspaceId", "emailNormalized");

-- CreateIndex
CREATE INDEX "Contact_leadId_isPrimary_idx" ON "Contact"("leadId", "isPrimary");

-- CreateIndex
CREATE INDEX "LeadScore_workspaceId_total_idx" ON "LeadScore"("workspaceId", "total");

-- CreateIndex
CREATE INDEX "LeadScore_leadId_createdAt_idx" ON "LeadScore"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "ResearchRecord_workspaceId_status_idx" ON "ResearchRecord"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "ResearchRecord_leadId_createdAt_idx" ON "ResearchRecord"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "WebsiteAudit_leadId_createdAt_idx" ON "WebsiteAudit"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "ResearchEvidence_leadId_observedAt_idx" ON "ResearchEvidence"("leadId", "observedAt");

-- CreateIndex
CREATE INDEX "ResearchEvidence_researchRecordId_idx" ON "ResearchEvidence"("researchRecordId");

-- CreateIndex
CREATE INDEX "ResearchEvidence_websiteAuditId_idx" ON "ResearchEvidence"("websiteAuditId");

-- CreateIndex
CREATE INDEX "Campaign_workspaceId_status_idx" ON "Campaign"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "CampaignLead_workspaceId_status_idx" ON "CampaignLead"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignLead_campaignId_leadId_key" ON "CampaignLead"("campaignId", "leadId");

-- CreateIndex
CREATE INDEX "EmailDraft_workspaceId_status_idx" ON "EmailDraft"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "EmailDraft_campaignId_status_idx" ON "EmailDraft"("campaignId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EmailMessage_providerMessageId_key" ON "EmailMessage"("providerMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailMessage_idempotencyKey_key" ON "EmailMessage"("idempotencyKey");

-- CreateIndex
CREATE INDEX "EmailMessage_workspaceId_status_idx" ON "EmailMessage"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "EmailMessage_leadId_createdAt_idx" ON "EmailMessage"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailEvent_messageId_occurredAt_idx" ON "EmailEvent"("messageId", "occurredAt");

-- CreateIndex
CREATE INDEX "EmailEvent_workspaceId_type_idx" ON "EmailEvent"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "Reply_workspaceId_category_idx" ON "Reply"("workspaceId", "category");

-- CreateIndex
CREATE INDEX "Reply_leadId_receivedAt_idx" ON "Reply"("leadId", "receivedAt");

-- CreateIndex
CREATE INDEX "SuppressionEntry_workspaceId_reason_idx" ON "SuppressionEntry"("workspaceId", "reason");

-- CreateIndex
CREATE UNIQUE INDEX "SuppressionEntry_workspaceId_emailNormalized_key" ON "SuppressionEntry"("workspaceId", "emailNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledJob_idempotencyKey_key" ON "ScheduledJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ScheduledJob_workspaceId_status_runAt_idx" ON "ScheduledJob"("workspaceId", "status", "runAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderConnection_workspaceId_type_providerName_key" ON "ProviderConnection"("workspaceId", "type", "providerName");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_workspaceId_key" ON "Subscription"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "UsageRecord_workspaceId_metric_idx" ON "UsageRecord"("workspaceId", "metric");

-- CreateIndex
CREATE UNIQUE INDEX "UsageRecord_workspaceId_periodStart_metric_key" ON "UsageRecord"("workspaceId", "periodStart", "metric");

-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_createdAt_idx" ON "AuditLog"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdealCustomerProfile" ADD CONSTRAINT "IdealCustomerProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadScore" ADD CONSTRAINT "LeadScore_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadScore" ADD CONSTRAINT "LeadScore_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchRecord" ADD CONSTRAINT "ResearchRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchRecord" ADD CONSTRAINT "ResearchRecord_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteAudit" ADD CONSTRAINT "WebsiteAudit_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteAudit" ADD CONSTRAINT "WebsiteAudit_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchEvidence" ADD CONSTRAINT "ResearchEvidence_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchEvidence" ADD CONSTRAINT "ResearchEvidence_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchEvidence" ADD CONSTRAINT "ResearchEvidence_researchRecordId_fkey" FOREIGN KEY ("researchRecordId") REFERENCES "ResearchRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchEvidence" ADD CONSTRAINT "ResearchEvidence_websiteAuditId_fkey" FOREIGN KEY ("websiteAuditId") REFERENCES "WebsiteAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignLead" ADD CONSTRAINT "CampaignLead_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignLead" ADD CONSTRAINT "CampaignLead_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignLead" ADD CONSTRAINT "CampaignLead_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDraft" ADD CONSTRAINT "EmailDraft_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDraft" ADD CONSTRAINT "EmailDraft_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDraft" ADD CONSTRAINT "EmailDraft_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "EmailDraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailEvent" ADD CONSTRAINT "EmailEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailEvent" ADD CONSTRAINT "EmailEvent_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "EmailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reply" ADD CONSTRAINT "Reply_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reply" ADD CONSTRAINT "Reply_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "EmailMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reply" ADD CONSTRAINT "Reply_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reply" ADD CONSTRAINT "Reply_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reply" ADD CONSTRAINT "Reply_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuppressionEntry" ADD CONSTRAINT "SuppressionEntry_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledJob" ADD CONSTRAINT "ScheduledJob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderConnection" ADD CONSTRAINT "ProviderConnection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
