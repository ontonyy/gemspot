package ee.gemspot.api.web;

import ee.gemspot.api.dto.AdminPlaceDto;
import ee.gemspot.api.dto.AdminReportDto;
import ee.gemspot.api.dto.AdminStatsDto;
import ee.gemspot.api.dto.AdminSubmissionDto;
import ee.gemspot.api.dto.AdminUserDto;
import ee.gemspot.api.dto.ApproveResultDto;
import ee.gemspot.api.dto.EventCountDto;
import ee.gemspot.api.dto.RejectResultDto;
import ee.gemspot.api.dto.SetPlaceStatusDto;
import ee.gemspot.api.dto.SetReportStatusDto;
import ee.gemspot.api.service.AdminService;
import ee.gemspot.api.service.EventsService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Role-gated moderation API (JWT + ADMIN role wired in Block 5). 11 routes.
 *  approve/reject → 200 (Nest @HttpCode(200)); PATCH → 200 default. */
@RestController
@RequestMapping("/admin")
public class AdminController {

    private final AdminService admin;
    private final EventsService events;

    public AdminController(AdminService admin, EventsService events) {
        this.admin = admin;
        this.events = events;
    }

    @GetMapping("/events")
    public List<EventCountDto> eventCounts() {
        return events.counts();
    }

    @GetMapping("/stats")
    public AdminStatsDto stats() {
        return admin.stats();
    }

    @GetMapping("/submissions")
    public List<AdminSubmissionDto> submissions(
            @RequestParam(name = "status", required = false) String status) {
        return admin.listSubmissions(status);
    }

    @PostMapping("/submissions/{id}/approve")
    @ResponseStatus(HttpStatus.OK)
    public ApproveResultDto approve(@PathVariable String id) {
        return admin.approveSubmission(id);
    }

    @PostMapping("/submissions/{id}/reject")
    @ResponseStatus(HttpStatus.OK)
    public RejectResultDto reject(@PathVariable String id) {
        return admin.rejectSubmission(id);
    }

    @GetMapping("/places")
    public List<AdminPlaceDto> places() {
        return admin.listPlaces();
    }

    @PatchMapping("/places/{id}/status")
    public AdminPlaceDto setPlaceStatus(@PathVariable String id, @Valid @RequestBody SetPlaceStatusDto body) {
        return admin.setPlaceStatus(id, body.status());
    }

    @GetMapping("/reports")
    public List<AdminReportDto> reports(
            @RequestParam(name = "status", required = false) String status) {
        return admin.listReports(status);
    }

    @PatchMapping("/reports/{id}/status")
    public AdminReportDto setReportStatus(@PathVariable String id, @Valid @RequestBody SetReportStatusDto body) {
        return admin.setReportStatus(id, body.status());
    }

    @GetMapping("/users")
    public List<AdminUserDto> users() {
        return admin.listUsers();
    }
}
