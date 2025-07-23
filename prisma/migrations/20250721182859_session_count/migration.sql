-- CreateTable
CREATE TABLE "SessionCount" (
    "shop" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SessionCount_pkey" PRIMARY KEY ("shop")
);
