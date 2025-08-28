-- CreateTable
CREATE TABLE "public"."AlertSettings" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "revenueRateLow" BOOLEAN NOT NULL DEFAULT false,
    "orderGrowthLow" BOOLEAN NOT NULL DEFAULT false,
    "trafficRateLow" BOOLEAN NOT NULL DEFAULT false,
    "conversionRateLow" BOOLEAN NOT NULL DEFAULT false,
    "alertEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "slackWebhookUrl" TEXT,
    "slackEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AlertSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlertSettings_shop_key" ON "public"."AlertSettings"("shop");
