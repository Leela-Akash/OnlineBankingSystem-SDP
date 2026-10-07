package com.banking.sdp.backend;

import com.banking.sdp.backend.security.RequestIdFilter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class ApiQualityTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("OpenAPI 3: /v3/api-docs endpoint returns valid OpenAPI JSON specification")
    void testOpenApiDocsAvailable() throws Exception {
        mockMvc.perform(get("/v3/api-docs")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.openapi", notNullValue()))
                .andExpect(jsonPath("$.info.title", is("Nexus Online Banking System API")))
                .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.type", is("http")))
                .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.scheme", is("bearer")));
    }

    @Test
    @DisplayName("OpenAPI 3: Swagger UI html is publicly accessible")
    void testSwaggerUiEndpointAccessible() throws Exception {
        mockMvc.perform(get("/swagger-ui/index.html"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Structured Logging: Generated X-Request-Id is echoed in response headers")
    void testRequestIdHeaderGenerated() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(header().exists(RequestIdFilter.REQUEST_ID_HEADER));
    }

    @Test
    @DisplayName("Structured Logging: Custom incoming X-Request-Id is preserved in response header")
    void testCustomRequestIdPreserved() throws Exception {
        String testCorrelationId = "custom-correlation-id-9988";
        mockMvc.perform(get("/actuator/health")
                        .header(RequestIdFilter.REQUEST_ID_HEADER, testCorrelationId))
                .andExpect(status().isOk())
                .andExpect(header().string(RequestIdFilter.REQUEST_ID_HEADER, testCorrelationId));
    }
}
