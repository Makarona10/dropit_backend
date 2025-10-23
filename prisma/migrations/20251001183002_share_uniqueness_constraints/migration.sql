/*
  Warnings:

  - A unique constraint covering the columns `[fileId,sharedWithId]` on the table `Share` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[folderId,sharedWithId]` on the table `Share` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Share_fileId_sharedWithId_key" ON "Share"("fileId", "sharedWithId");

-- CreateIndex
CREATE UNIQUE INDEX "Share_folderId_sharedWithId_key" ON "Share"("folderId", "sharedWithId");
