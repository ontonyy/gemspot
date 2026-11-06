package ee.gemspot.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import ee.gemspot.api.domain.Event;
import ee.gemspot.api.dto.CreateEventDto;
import ee.gemspot.api.dto.EventCountDto;
import ee.gemspot.api.repository.EventRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Byte-identical port of {@code events.service.ts}.
 */
@Service
public class EventsService {

    private final EventRepository eventRepo;
    private final ObjectMapper objectMapper;
    private final int maxPropsBytes;
    private final int maxPropsDepth;
    private final int maxObjectKeys;

    public EventsService(
            EventRepository eventRepo,
            ObjectMapper objectMapper,
            @Value("${EVENTS_MAX_PROPS_BYTES:8192}") int maxPropsBytes,
            @Value("${EVENTS_MAX_PROPS_DEPTH:5}") int maxPropsDepth,
            @Value("${EVENTS_MAX_OBJECT_KEYS:50}") int maxObjectKeys) {
        this.eventRepo = eventRepo;
        this.objectMapper = objectMapper;
        this.maxPropsBytes = maxPropsBytes;
        this.maxPropsDepth = maxPropsDepth;
        this.maxObjectKeys = maxObjectKeys;
    }

    public void track(CreateEventDto input) {
        validateProps(input.props());
        Event event = new Event();
        event.setName(input.name());
        event.setProps(input.props());
        event.setPlaceId(input.placeId());
        eventRepo.save(event);
    }

    private void validateProps(Map<String, Object> props) {
        if (props == null) {
            return;
        }
        validateStructure(props, 1);
        try {
            objectMapper.writeValue(new BoundedOutputStream(maxPropsBytes), props);
        } catch (PayloadLimitExceededException ex) {
            throw badRequest("Event props must not exceed " + maxPropsBytes + " serialized bytes");
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to validate event props", ex);
        }
    }

    private void validateStructure(Object value, int depth) {
        if (value instanceof Map<?, ?> object) {
            if (depth > maxPropsDepth) {
                throw badRequest("Event props must not exceed nesting depth " + maxPropsDepth);
            }
            if (object.size() > maxObjectKeys) {
                throw badRequest("Event props object exceeds the maximum of " + maxObjectKeys + " keys");
            }
            object.values().forEach(child -> validateStructure(child, depth + 1));
        } else if (value instanceof List<?> array) {
            if (depth > maxPropsDepth) {
                throw badRequest("Event props must not exceed nesting depth " + maxPropsDepth);
            }
            array.forEach(child -> validateStructure(child, depth + 1));
        }
    }

    private static ResponseStatusException badRequest(String reason) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
    }

    private static final class BoundedOutputStream extends OutputStream {
        private final int maxBytes;
        private int written;

        private BoundedOutputStream(int maxBytes) {
            this.maxBytes = maxBytes;
        }

        @Override
        public void write(int value) throws IOException {
            ensureWithinLimit(1);
            written++;
        }

        @Override
        public void write(byte[] bytes, int offset, int length) throws IOException {
            ensureWithinLimit(length);
            written += length;
        }

        private void ensureWithinLimit(int length) throws PayloadLimitExceededException {
            if (length > maxBytes - written) {
                throw new PayloadLimitExceededException();
            }
        }
    }

    private static final class PayloadLimitExceededException extends IOException {}

    /** Grouped counts for the admin dashboard, ordered by count desc. */
    public List<EventCountDto> counts() {
        Map<String, Long> grouped = new LinkedHashMap<>();
        for (Event e : eventRepo.findAll()) {
            grouped.merge(e.getName(), 1L, Long::sum);
        }
        List<EventCountDto> out = new ArrayList<>();
        for (Map.Entry<String, Long> entry : grouped.entrySet()) {
            out.add(new EventCountDto(entry.getKey(), entry.getValue()));
        }
        out.sort(Comparator.comparingLong(EventCountDto::count).reversed());
        return out;
    }
}
