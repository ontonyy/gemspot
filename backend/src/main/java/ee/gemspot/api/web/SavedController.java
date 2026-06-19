package ee.gemspot.api.web;

import ee.gemspot.api.common.CurrentUser;
import ee.gemspot.api.dto.MergeSavedDto;
import ee.gemspot.api.dto.SavePlaceDto;
import ee.gemspot.api.service.SavedService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Auth-gated saved-places sync. Returns the user's place-id list. POSTs → 200. */
@RestController
@RequestMapping("/saved")
public class SavedController {

    private final SavedService saved;

    public SavedController(SavedService saved) {
        this.saved = saved;
    }

    @GetMapping
    public List<String> list() {
        return saved.list(CurrentUser.id());
    }

    @PostMapping
    public List<String> add(@Valid @RequestBody SavePlaceDto body) {
        return saved.add(CurrentUser.id(), body.placeId());
    }

    @PostMapping("/merge")
    public List<String> merge(@Valid @RequestBody MergeSavedDto body) {
        return saved.merge(CurrentUser.id(), body.placeIds());
    }

    @DeleteMapping("/{placeId}")
    public List<String> remove(@PathVariable String placeId) {
        return saved.remove(CurrentUser.id(), placeId);
    }
}
