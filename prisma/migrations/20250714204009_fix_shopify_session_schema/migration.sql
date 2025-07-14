-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "sessionData" JSONB NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficEvent" (
    "id" SERIAL NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "pageUrl" TEXT,

    CONSTRAINT "TrafficEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Metric" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ttfb" INTEGER,
    "fcp" INTEGER,
    "lcp" INTEGER,
    "fid" INTEGER,
    "cls" DOUBLE PRECISION,
    "domLoad" INTEGER,
    "fullLoad" INTEGER,
    "dnsTime" INTEGER,
    "tcpTime" INTEGER,
    "sslTime" INTEGER,
    "requestTime" INTEGER,
    "responseTime" INTEGER,
    "domInteractive" INTEGER,
    "firstPaint" INTEGER,
    "totalBlockingTime" INTEGER,
    "usedMemoryMB" DOUBLE PRECISION,
    "totalMemoryMB" DOUBLE PRECISION,
    "limitMemoryMB" DOUBLE PRECISION,
    "networkType" TEXT,
    "rtt" INTEGER,
    "downlink" DOUBLE PRECISION,
    "saveData" BOOLEAN,

    CONSTRAINT "Metric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Session_shop_idx" ON "Session"("shop");
