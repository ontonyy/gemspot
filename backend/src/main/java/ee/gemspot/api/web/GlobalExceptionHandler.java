package ee.gemspot.api.web;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Maps exceptions to the NestJS HttpException body shape the SPA reads
 * ({@code { statusCode, message, error }}). The frontend api clients pull
 * {@code body.message} (string or string[]) for display — validation errors
 * stay an array, single failures a string, matching class-validator/Nest.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** Bean-validation (@Valid record DTOs) → 400 with message[] of field errors. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> onValidation(MethodArgumentNotValidException ex) {
        List<String> messages = ex.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + " " + f.getDefaultMessage())
                .toList();
        return body(HttpStatus.BAD_REQUEST, messages);
    }

    /** Service-thrown status exceptions (NotFound 404, Conflict 409, Unauthorized 401, …). */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> onStatus(ResponseStatusException ex) {
        HttpStatusCode status = ex.getStatusCode();
        String message = ex.getReason() != null ? ex.getReason() : reason(status);
        return bodyFor(status, message);
    }

    private static ResponseEntity<Map<String, Object>> body(HttpStatus status, Object message) {
        return bodyFor(status, message);
    }

    private static ResponseEntity<Map<String, Object>> bodyFor(HttpStatusCode status, Object message) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("statusCode", status.value());
        out.put("message", message);
        out.put("error", reason(status));
        return ResponseEntity.status(status).body(out);
    }

    private static String reason(HttpStatusCode status) {
        HttpStatus resolved = HttpStatus.resolve(status.value());
        return resolved != null ? resolved.getReasonPhrase() : "Error";
    }
}
