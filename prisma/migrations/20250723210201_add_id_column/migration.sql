/*
  Warnings:

  - The primary key for the `SessionCount` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[shop,createdAt]` on the table `SessionCount` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `SessionCount` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "SessionCount" DROP CONSTRAINT "SessionCount_pkey",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "SessionCount_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "SessionCheckout" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "sessionIdFromPixel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pageViews" INTEGER NOT NULL DEFAULT 1,
    "hasInitiatedCheckout" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SessionCheckout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionCheckout_sessionIdFromPixel_key" ON "SessionCheckout"("sessionIdFromPixel");

-- CreateIndex
CREATE UNIQUE INDEX "SessionCount_shop_createdAt_key" ON "SessionCount"("shop", "createdAt");
