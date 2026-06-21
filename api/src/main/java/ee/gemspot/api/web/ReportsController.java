package ee.gemspot.api.web;

import ee.gemspot.api.common.CurrentUser;
import ee.gemspot.api.dto.ReportDto;
import ee.gemspot.api.dto.ReportInputDto;
import ee.gemspot.api.service.ReportsService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Auth-gated. POST creates an OPEN report (201, Nest default). */
@RestController
@RequestMapping("/reports")
public class ReportsController {

    private final ReportsService reports;

    public ReportsController(ReportsService reports) {
        this.reports = reports;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReportDto create(@Valid @RequestBody ReportInputDto input) {
        return reports.create(input, CurrentUser.id());
    }

    @GetMapping("/mine")
    public List<ReportDto> mine() {
        return reports.listMine(CurrentUser.id());
    }
}
