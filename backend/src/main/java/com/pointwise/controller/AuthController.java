package com.pointwise.controller;

import com.pointwise.security.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public record LoginRequest(String username, String password) {}

    private final JwtService jwtService;
    private final String adminUsername;
    private final String adminPassword;

    public AuthController(JwtService jwtService,
                          @Value("${app.admin.username}") String adminUsername,
                          @Value("${app.admin.password}") String adminPassword) {
        this.jwtService = jwtService;
        this.adminUsername = adminUsername;
        this.adminPassword = adminPassword;
    }

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody LoginRequest req) {
        boolean ok = req.username() != null && req.password() != null
                && same(req.username(), adminUsername)
                && same(req.password(), adminPassword);

        if (!ok) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Wrong username or password");
        }
        return Map.of("token", jwtService.generateToken(adminUsername));
    }

    private boolean same(String a, String b) {
        return MessageDigest.isEqual(
                a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }
}