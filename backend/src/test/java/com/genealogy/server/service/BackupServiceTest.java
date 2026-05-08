package com.genealogy.server.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class BackupServiceTest {

    private final BackupService service = new BackupService(
            "jdbc:mysql://localhost:3306/genealogy", "root", "password");

    @Test
    void extractDbName_standardUrl() {
        assertEquals("genealogy", service.extractDbName("jdbc:mysql://localhost:3306/genealogy"));
    }

    @Test
    void extractDbName_urlWithQueryParams() {
        assertEquals("genealogy",
                service.extractDbName("jdbc:mysql://localhost:3306/genealogy?useSSL=false&serverTimezone=UTC"));
    }

    @Test
    void extractDbName_urlWithoutPort() {
        assertEquals("mydb", service.extractDbName("jdbc:mysql://dbhost/mydb"));
    }

    @Test
    void extractHost_localhost() {
        assertEquals("localhost", service.extractHost("jdbc:mysql://localhost:3306/genealogy"));
    }

    @Test
    void extractHost_ipAddress() {
        assertEquals("192.168.1.1", service.extractHost("jdbc:mysql://192.168.1.1:3306/genealogy"));
    }

    @Test
    void extractHost_hostname() {
        assertEquals("db.example.com", service.extractHost("jdbc:mysql://db.example.com:3306/genealogy"));
    }

    @Test
    void extractHost_defaultPort() {
        assertEquals("dbhost", service.extractHost("jdbc:mysql://dbhost/genealogy"));
    }

    @Test
    void extractPort_standard() {
        assertEquals(3306, service.extractPort("jdbc:mysql://localhost:3306/genealogy"));
    }

    @Test
    void extractPort_custom() {
        assertEquals(3307, service.extractPort("jdbc:mysql://localhost:3307/genealogy"));
    }

    @Test
    void extractPort_defaultWhenOmitted() {
        assertEquals(3306, service.extractPort("jdbc:mysql://dbhost/genealogy"));
    }

    @Test
    void validateJdbcUrl_null_throwsException() {
        assertThrows(IllegalArgumentException.class, () -> service.extractDbName(null));
    }

    @Test
    void validateJdbcUrl_nonMysql_throwsException() {
        assertThrows(IllegalArgumentException.class,
                () -> service.extractDbName("jdbc:postgresql://localhost/db"));
    }

    @Test
    void validateJdbcUrl_emptyString_throwsException() {
        assertThrows(IllegalArgumentException.class,
                () -> service.extractDbName(""));
    }
}
