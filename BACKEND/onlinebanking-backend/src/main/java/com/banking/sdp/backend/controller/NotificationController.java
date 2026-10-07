package com.banking.sdp.backend.controller;

import com.banking.sdp.backend.exception.ResourceNotFoundException;
import com.banking.sdp.backend.model.Customer;
import com.banking.sdp.backend.model.Notification;
import com.banking.sdp.backend.repository.CustomerRepository;
import com.banking.sdp.backend.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/v1/notification", "/notification"})
@Tag(name = "Notification Management", description = "Endpoints for customer transaction notifications and inbox alerts")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private CustomerRepository customerRepository;

    @Operation(summary = "Get all customer notifications", description = "Retrieves all notifications (read and unread) for a customer")
    @GetMapping("/customer/{customerId}")
    @PreAuthorize("@securityService.isCustomerOwner(#customerId)")
    public ResponseEntity<List<Notification>> getNotifications(
            @Parameter(description = "Customer ID") @PathVariable Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + customerId));
        List<Notification> notifications = notificationService.getNotificationsByCustomer(customerId, customer);
        return ResponseEntity.ok(notifications);
    }

    @Operation(summary = "Get unread notifications count", description = "Returns the number of unread alerts for the customer")
    @GetMapping("/customer/{customerId}/unread/count")
    @PreAuthorize("@securityService.isCustomerOwner(#customerId)")
    public ResponseEntity<Map<String, Long>> getUnreadCount(
            @Parameter(description = "Customer ID") @PathVariable Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + customerId));
        Long count = notificationService.getUnreadCount(customer);
        Map<String, Long> response = new HashMap<>();
        response.put("unreadCount", count);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Get unread notifications", description = "Retrieves only unread notices for a customer")
    @GetMapping("/customer/{customerId}/unread")
    @PreAuthorize("@securityService.isCustomerOwner(#customerId)")
    public ResponseEntity<List<Notification>> getUnreadNotifications(
            @Parameter(description = "Customer ID") @PathVariable Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + customerId));
        List<Notification> notifications = notificationService.getUnreadNotifications(customer);
        return ResponseEntity.ok(notifications);
    }

    @Operation(summary = "Mark single notification as read", description = "Updates a specific notification status to read")
    @PutMapping("/read/{notificationId}")
    public ResponseEntity<Map<String, String>> markAsRead(
            @Parameter(description = "Notification ID") @PathVariable Long notificationId) {
        notificationService.markAsRead(notificationId);
        return ResponseEntity.ok(Map.of("message", "Notification marked as read"));
    }

    @Operation(summary = "Mark all notifications as read", description = "Updates all unread alerts for a customer to read")
    @PutMapping("/customer/{customerId}/read-all")
    @PreAuthorize("@securityService.isCustomerOwner(#customerId)")
    public ResponseEntity<Map<String, String>> markAllAsRead(
            @Parameter(description = "Customer ID") @PathVariable Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + customerId));
        notificationService.markAllAsRead(customerId, customer);
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }
}
