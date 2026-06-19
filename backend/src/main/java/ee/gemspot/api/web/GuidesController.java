package ee.gemspot.api.web;

import ee.gemspot.api.dto.GuideDetailDto;
import ee.gemspot.api.dto.GuideDto;
import ee.gemspot.api.service.GuidesService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/guides")
public class GuidesController {

    private final GuidesService guides;

    public GuidesController(GuidesService guides) {
        this.guides = guides;
    }

    @GetMapping
    public List<GuideDto> list() {
        return guides.list();
    }

    @GetMapping("/{id}")
    public GuideDetailDto getOne(@PathVariable String id) {
        return guides.getById(id);
    }
}
