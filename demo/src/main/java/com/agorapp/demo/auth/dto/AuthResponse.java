package com.agorapp.demo.auth.dto;

public record AuthResponse(String token, String tokenType, long expiresInSeconds) {
}
