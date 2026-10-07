package com.banking.sdp.backend.controller;

import com.banking.sdp.backend.exception.ResourceNotFoundException;
import com.banking.sdp.backend.model.Customer;
import com.banking.sdp.backend.model.Notification;
import com.banking.sdp.backend.repository.CustomerRepository;
import com.banking.sdp.backend.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/notification")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private CustomerRepository customerRepository;

    @GetMapping("/customer/{customerId}")
    @PreAuthorize("@securityService.isCustomerOwner(#customerId)")
    public ResponseEntity<List<Notification>> getNotifications(@PathVariable Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + customerId));
        List<Notification> notifications = notificationService.getNotificationsByCustomer(customerId, customer);
        return ResponseEntity.ok(notifications);
    }

    @GetMapping("/customer/{customerId}/unread/count")
    @PreAuthorize("@securityService.isCustomerOwner(#customerId)")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@PathVariable Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + customerId));
        Long count = notificationService.getUnreadCount(customer);
        Map<String, Long> response = new HashMap<>();
        response.put("unreadCount", count);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/customer/{customerId}/unread")
    @PreAuthorize("@securityService.isCustomerOwner(#customerId)")
    public ResponseEntity<List<Notification>> getUnreadNotifications(@PathVariable Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + customerId));
        List<Notification> notifications = notificationService.getUnreadNotifications(customer);
        return ResponseEntity.ok(notifications);
    }

    @PutMapping("/read/{notificationId}")
    public ResponseEntity<Map<String, String>> markAsRead(@PathVariable Long notificationId) {
        notificationService.markAsRead(notificationId);
        return ResponseEntity.ok(Map.of("message", "Notification marked as read"));
    }

    @PutMapping("/customer/{customerId}/read-all")
    @PreAuthorize("@securityService.isCustomerOwner(#customerId)")
    public ResponseEntity<Map<String, String>> markAllAsRead(@PathVariable Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + customerId));
        notificationService.markAllAsRead(customerId, customer);
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }
}
