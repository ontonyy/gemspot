package ee.gemspot.api.service;

import ee.gemspot.api.domain.Event;
import ee.gemspot.api.dto.CreateEventDto;
import ee.gemspot.api.dto.EventCountDto;
import ee.gemspot.api.repository.EventRepository;
import org.springframework.stereotype.Service;

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

    public EventsService(EventRepository eventRepo) {
        this.eventRepo = eventRepo;
    }

    public void track(CreateEventDto input) {
        Event event = new Event();
        event.setName(input.name());
        event.setProps(input.props());
        event.setPlaceId(input.placeId());
        eventRepo.save(event);
    }

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
