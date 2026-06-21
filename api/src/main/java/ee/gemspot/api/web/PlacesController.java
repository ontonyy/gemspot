package ee.gemspot.api.web;

import ee.gemspot.api.dto.PlaceCardDto;
import ee.gemspot.api.dto.PlaceDetailDto;
import ee.gemspot.api.service.PlacesService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Public catalog. */
@RestController
@RequestMapping("/places")
public class PlacesController {

    private final PlacesService places;

    public PlacesController(PlacesService places) {
        this.places = places;
    }

    @GetMapping
    public List<PlaceCardDto> list(@RequestParam(name = "cat", required = false) String cat) {
        return places.list(cat);
    }

    // slug, not id — matches the mock getPlace(slug) seam.
    @GetMapping("/{slug}")
    public PlaceDetailDto getOne(@PathVariable String slug) {
        return places.getBySlug(slug);
    }
}
