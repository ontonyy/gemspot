package ee.gemspot.api.storage;

import org.springframework.web.multipart.MultipartFile;

/**
 * Object-storage seam (1:1 with the Nest {@code StorageService}). The uploads
 * controller codes against this interface; the backing impl is swappable.
 * {@link SupabaseStorageService} is the production binding (Supabase Storage,
 * S3-compatible). Returns the public URL the SPA then carries on a submission.
 */
public interface StorageService {

    /** Persisted-file result: { url } — byte-identical to the Nest StoredFile. */
    record StoredFile(String url) {}

    StoredFile save(MultipartFile file);
}
