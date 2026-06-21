package ee.gemspot.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/** { "ok": true } — logout + events ack shape. */
public record OkDto(@JsonProperty("ok") boolean ok) {}
