package ee.gemspot.api.web;

import ee.gemspot.api.common.CurrentUser;
import ee.gemspot.api.dto.SubmissionDto;
import ee.gemspot.api.dto.SubmissionInputDto;
import ee.gemspot.api.service.SubmissionsService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Auth-gated. POST creates a PENDING submission (201, Nest default). */
@RestController
@RequestMapping("/submissions")
public class SubmissionsController {

    private final SubmissionsService submissions;

    public SubmissionsController(SubmissionsService submissions) {
        this.submissions = submissions;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SubmissionDto create(@Valid @RequestBody SubmissionInputDto input) {
        return submissions.create(input, CurrentUser.id());
    }

    @GetMapping("/mine")
    public List<SubmissionDto> mine() {
        return submissions.listMine(CurrentUser.id());
    }
}
