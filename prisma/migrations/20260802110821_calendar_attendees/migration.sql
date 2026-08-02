/*
  Warnings:

  - You are about to drop the column `ownerId` on the `CalendarEvent` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "_CalendarEventToProfile" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_CalendarEventToProfile_A_fkey" FOREIGN KEY ("A") REFERENCES "CalendarEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_CalendarEventToProfile_B_fkey" FOREIGN KEY ("B") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CalendarEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "category" TEXT NOT NULL DEFAULT 'other',
    CONSTRAINT "CalendarEvent_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CalendarEvent" ("category", "endTime", "familyId", "id", "startTime", "title") SELECT "category", "endTime", "familyId", "id", "startTime", "title" FROM "CalendarEvent";
DROP TABLE "CalendarEvent";
ALTER TABLE "new_CalendarEvent" RENAME TO "CalendarEvent";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "_CalendarEventToProfile_AB_unique" ON "_CalendarEventToProfile"("A", "B");

-- CreateIndex
CREATE INDEX "_CalendarEventToProfile_B_index" ON "_CalendarEventToProfile"("B");
