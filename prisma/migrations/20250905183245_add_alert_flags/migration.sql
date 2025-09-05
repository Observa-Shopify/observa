-- AlterTable
ALTER TABLE "public"."AlertSettings" ADD COLUMN     "sendConversionAlert" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sendSalesAlert" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sendTrafficAlert" BOOLEAN NOT NULL DEFAULT false;
