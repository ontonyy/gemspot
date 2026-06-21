package ee.gemspot.api.service;

import ee.gemspot.api.dto.CategoryDto;
import ee.gemspot.api.mapper.PlaceMapper;
import ee.gemspot.api.repository.CategoryRepository;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Mirrors Nest CategoriesService
 * (backend/src/application/categories/categories.service.ts).
 */
@Service
public class CategoriesService {

    private final CategoryRepository categoryRepo;
    private final PlaceMapper mapper;

    public CategoriesService(CategoryRepository categoryRepo, PlaceMapper mapper) {
        this.categoryRepo = categoryRepo;
        this.mapper = mapper;
    }

    public List<CategoryDto> list() {
        return categoryRepo.findAllByOrderBySortAsc().stream()
                .map(mapper::toCategoryDto)
                .toList();
    }
}
