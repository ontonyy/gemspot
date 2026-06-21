package ee.gemspot.api.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.UUID;

/**
 * Supabase Storage backend via the S3-compatible endpoint. Uploads
 * {@code {uuid}.{ext}} into the bucket and returns the bucket's public object
 * URL. Public-read bucket assumed (place photos are public).
 */
@Service
public class SupabaseStorageService implements StorageService {

    private final S3Client s3;
    private final String bucket;
    private final String publicBase;

    public SupabaseStorageService(
            S3Client s3,
            @Value("${supabase.s3.bucket}") String bucket,
            @Value("${supabase.s3.endpoint}") String endpoint) {
        this.s3 = s3;
        this.bucket = bucket;
        // S3 endpoint .../storage/v1/s3 → public objects at .../storage/v1/object/public/{bucket}
        String base = endpoint.replaceFirst("/storage/v1/s3/?$", "/storage/v1/object/public");
        this.publicBase = base + "/" + bucket;
    }

    @Override
    public StoredFile save(MultipartFile file) {
        String name = UUID.randomUUID() + ext(file.getOriginalFilename(), file.getContentType());
        try {
            s3.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(name)
                            .contentType(file.getContentType())
                            .build(),
                    RequestBody.fromBytes(file.getBytes()));
        } catch (IOException e) {
            throw new ResponseStatusException(
                    org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, "Failed to read upload");
        }
        return new StoredFile(publicBase + "/" + name);
    }

    /** Extension from the original filename, falling back to the mime type. Lowercased, leading dot. */
    private static String ext(String originalName, String mime) {
        if (originalName != null) {
            int dot = originalName.lastIndexOf('.');
            int slash = Math.max(originalName.lastIndexOf('/'), originalName.lastIndexOf('\\'));
            if (dot > slash && dot >= 0) {
                return originalName.substring(dot).toLowerCase();
            }
        }
        return mimeExt(mime);
    }

    private static String mimeExt(String mime) {
        if (mime == null) return "";
        return switch (mime) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            default -> "";
        };
    }
}
