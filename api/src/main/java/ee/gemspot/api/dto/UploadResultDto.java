package ee.gemspot.api.dto;

/** POST /uploads response: { url } (Supabase public URL). */
public record UploadResultDto(String url) {}
