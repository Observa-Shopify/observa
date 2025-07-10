-- CreateTable
CREATE TABLE "TrafficEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopDomain" TEXT NOT NULL,
    "eventDate" DATETIME NOT NULL,
    "pageUrl" TEXT
);
