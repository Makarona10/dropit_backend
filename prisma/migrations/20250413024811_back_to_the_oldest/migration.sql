/*
  Warnings:

  - You are about to drop the column `fileId` on the `Tag` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Tag" DROP CONSTRAINT "Tag_fileId_fkey";

-- AlterTable
ALTER TABLE "Tag" DROP COLUMN "fileId";

-- CreateTable
CREATE TABLE "FilesTags" (
    "fileId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,

    CONSTRAINT "FilesTags_pkey" PRIMARY KEY ("fileId","tagId")
);

-- AddForeignKey
ALTER TABLE "FilesTags" ADD CONSTRAINT "FilesTags_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilesTags" ADD CONSTRAINT "FilesTags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
