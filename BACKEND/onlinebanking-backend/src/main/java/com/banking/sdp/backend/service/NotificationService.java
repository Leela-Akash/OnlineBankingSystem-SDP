package com.banking.sdp.backend.service;

import com.banking.sdp.backend.model.Notification;
import com.banking.sdp.backend.model.Customer;
import com.banking.sdp.backend.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationService {
    
    @Autowired
    private NotificationRepository notificationRepository;
    
    public void createNotification(Customer customer, String title, String message, String type) {
        Notification notification = new Notification(customer, title, message, type);
        notificationRepository.save(notification);
    }

    public void createTransactionNotification(Customer customer, String title, String message) {
        createNotification(customer, title, message, "transaction");
    }
    
    public List<Notification> getNotificationsByCustomer(Long customerId, Customer customer) {
        return notificationRepository.findByCustomerOrderByCreatedAtDesc(customer);
    }
    
    public List<Notification> getUnreadNotifications(Customer customer) {
        return notificationRepository.findByCustomerAndIsReadFalse(customer);
    }
    
    public Long getUnreadCount(Customer customer) {
        return notificationRepository.countByCustomerAndIsReadFalse(customer);
    }
    
    @Transactional
    public void markAsRead(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        notification.setIsRead(true);
        notificationRepository.save(notification);
    }
    
    @Transactional
    public void markAllAsRead(Long customerId, Customer customer) {
        List<Notification> notifications = notificationRepository.findByCustomerAndIsReadFalse(customer);
        notifications.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(notifications);
    }
}

