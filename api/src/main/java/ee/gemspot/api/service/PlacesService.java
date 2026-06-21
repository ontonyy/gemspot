package ee.gemspot.api.service;

import ee.gemspot.api.domain.Place;
import ee.gemspot.api.domain.PlaceStatus;
import ee.gemspot.api.dto.PlaceCardDto;
import ee.gemspot.api.dto.PlaceDetailDto;
import ee.gemspot.api.mapper.PlaceMapper;
import ee.gemspot.api.repository.PlaceRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Mirrors Nest PlacesService (backend/src/application/places/places.service.ts).
 * Public map shows ACTIVE places only; INACTIVE/DRAFT hidden.
 */
@Service
public class PlacesService {

    private final PlaceRepository placeRepo;
    private final PlaceMapper mapper;

    public PlacesService(PlaceRepository placeRepo, PlaceMapper mapper) {
        this.placeRepo = placeRepo;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<PlaceCardDto> list(String cat) {
        List<Place> active = placeRepo.findByStatusOrderBySortAsc(PlaceStatus.ACTIVE);
        return active.stream()
                // cat filter mirrors Nest `categories: { some: { categoryId: cat } }`
                .filter(p -> cat == null || p.getCategories().stream()
                        .anyMatch(pc -> pc.getCategory().getId().equals(cat)))
                .map(mapper::toCard)
                .toList();
    }

    @Transactional(readOnly = true)
    public PlaceDetailDto getBySlug(String slug) {
        Place place = placeRepo.findBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "place not found: " + slug));
        return mapper.toDetail(place);
    }
}
