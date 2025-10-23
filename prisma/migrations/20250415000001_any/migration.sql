-- CreateTable
CREATE TABLE "DeletedFolders" (
    "folderId" INTEGER NOT NULL,

    CONSTRAINT "DeletedFolders_pkey" PRIMARY KEY ("folderId")
);

-- AddForeignKey
ALTER TABLE "DeletedFolders" ADD CONSTRAINT "DeletedFolders_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
