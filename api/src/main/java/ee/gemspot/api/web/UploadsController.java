package ee.gemspot.api.web;

import ee.gemspot.api.dto.UploadResultDto;
import ee.gemspot.api.storage.StorageService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.Set;

/** Auth-gated multipart photo upload. Field `file`; validates mime + 5 MB size;
 *  stores via {@link StorageService}; returns { url }. 201 (Nest default). */
@RestController
@RequestMapping("/uploads")
public class UploadsController {

    private static final long MAX_BYTES = 5L * 1024 * 1024; // 5 MB
    private static final Set<String> ALLOWED =
            Set.of("image/jpeg", "image/png", "image/webp", "image/gif");

    private final StorageService storage;

    public UploadsController(StorageService storage) {
        this.storage = storage;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UploadResultDto upload(@RequestParam(name = "file", required = false) MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No file uploaded (field \"file\")");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File too large (max 5MB)");
        }
        if (!ALLOWED.contains(file.getContentType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported image type");
        }
        return new UploadResultDto(storage.save(file).url());
    }
}
