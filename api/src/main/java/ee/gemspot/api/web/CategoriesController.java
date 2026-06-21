package ee.gemspot.api.web;

import ee.gemspot.api.dto.CategoryDto;
import ee.gemspot.api.service.CategoriesService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/categories")
public class CategoriesController {

    private final CategoriesService categories;

    public CategoriesController(CategoriesService categories) {
        this.categories = categories;
    }

    @GetMapping
    public List<CategoryDto> list() {
        return categories.list();
    }
}
