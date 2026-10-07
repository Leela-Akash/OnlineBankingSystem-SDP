package com.banking.sdp.backend.security;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LoginRateLimiterService {

    private static final int MAX_ATTEMPTS = 5;
    private static final long LOCK_TIME_DURATION_MS = 15 * 60 * 1000L; // 15 minutes

    private static class AttemptRecord {
        int attempts;
        long lastAttemptTime;
        long lockoutUntil;

        AttemptRecord(int attempts, long lastAttemptTime, long lockoutUntil) {
            this.attempts = attempts;
            this.lastAttemptTime = lastAttemptTime;
            this.lockoutUntil = lockoutUntil;
        }
    }

    private final Map<String, AttemptRecord> attemptsCache = new ConcurrentHashMap<>();

    public boolean isBlocked(String key) {
        if (key == null || key.isBlank()) return false;
        AttemptRecord record = attemptsCache.get(key.toLowerCase());
        if (record == null) return false;

        long now = System.currentTimeMillis();
        if (record.lockoutUntil > now) {
            return true;
        }

        // If lockout expired, clear record
        if (record.lockoutUntil > 0 && record.lockoutUntil <= now) {
            attemptsCache.remove(key.toLowerCase());
        }
        return false;
    }

    public long getRemainingLockoutSeconds(String key) {
        if (key == null) return 0;
        AttemptRecord record = attemptsCache.get(key.toLowerCase());
        if (record == null) return 0;
        long diff = record.lockoutUntil - System.currentTimeMillis();
        return diff > 0 ? (diff / 1000) : 0;
    }

    public void recordFailedAttempt(String key) {
        if (key == null || key.isBlank()) return;
        String normalizedKey = key.toLowerCase();
        long now = System.currentTimeMillis();

        attemptsCache.compute(normalizedKey, (k, existing) -> {
            if (existing == null) {
                return new AttemptRecord(1, now, 0);
            }

            // Reset count if last attempt was older than lock window
            if (now - existing.lastAttemptTime > LOCK_TIME_DURATION_MS) {
                return new AttemptRecord(1, now, 0);
            }

            int newAttempts = existing.attempts + 1;
            long lockoutUntil = (newAttempts >= MAX_ATTEMPTS) ? (now + LOCK_TIME_DURATION_MS) : 0;
            return new AttemptRecord(newAttempts, now, lockoutUntil);
        });
    }

    public void resetAttempts(String key) {
        if (key != null) {
            attemptsCache.remove(key.toLowerCase());
        }
    }
}
