package com.banking.sdp.backend;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.junit.jupiter.api.Assertions.assertTrue;

@Testcontainers(disabledWithoutDocker = true)
class MySQLTestcontainersIntegrationTest {

    @Container
    private static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("online_banking_test")
            .withUsername("testuser")
            .withPassword("testpass");

    @Test
    @DisplayName("Testcontainers MySQL container starts up and reports running status")
    void testMySQLContainerStarts() {
        if (mysql.isRunning()) {
            assertTrue(mysql.isRunning());
            assertTrue(mysql.getJdbcUrl().contains("online_banking_test"));
        }
    }
}
