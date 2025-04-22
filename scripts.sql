CREATE OR REPLACE FUNCTION insert_storage_quota_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO "StorageQuota" ("userId", "totalQuota", "usedQuota")
  VALUES (NEW.id, 20000, 0);
  RETURN NEW;
END;
$$;

CREATE TRIGGER storage_quota_trigger
AFTER INSERT ON "User"
FOR EACH ROW
EXECUTE FUNCTION insert_storage_quota_for_user();


--------------------------------

CREATE OR REPLACE FUNCTION update_storage_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  size_change_mb FLOAT;
BEGIN
  -- Convert the file size from KB to MB (1 MB = 1024 KB)
  IF TG_OP = 'INSERT' THEN
    -- For INSERT, use the new file's size (NEW.sizeInKb)
    size_change_mb := NEW."sizeInKb" / 1024;
    -- Increase the usedQuota for the user
    UPDATE "StorageQuota"
    SET "usedQuota" = "usedQuota" + size_change_mb
    WHERE "userId" = NEW."userId";
  ELSIF TG_OP = 'DELETE' THEN
    -- For DELETE, use the old file's size (OLD.sizeInKb)
    size_change_mb := OLD."sizeInKb" / 1024;
    -- Decrease the usedQuota for the user
    UPDATE "StorageQuota"
    SET "usedQuota" = GREATEST("usedQuota" - size_change_mb, 0)
    WHERE "userId" = OLD."userId";
  END IF;

  RETURN NULL; -- Return value is ignored for AFTER triggers
END;
$$;


CREATE TRIGGER file_storage_quota_trigger
AFTER INSERT OR DELETE ON "File"
FOR EACH ROW
EXECUTE FUNCTION update_storage_quota();
