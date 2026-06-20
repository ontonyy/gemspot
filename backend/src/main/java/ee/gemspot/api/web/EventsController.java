package ee.gemspot.api.web;

import ee.gemspot.api.dto.CreateEventDto;
import ee.gemspot.api.dto.OkDto;
import ee.gemspot.api.service.EventsService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Public analytics ingress — anonymous by design. 202 Accepted. */
@RestController
@RequestMapping("/events")
public class EventsController {

    private final EventsService events;

    public EventsController(EventsService events) {
        this.events = events;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public OkDto track(@Valid @RequestBody CreateEventDto body) {
        events.track(body);
        return new OkDto(true);
    }
}
