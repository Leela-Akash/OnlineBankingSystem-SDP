package com.banking.sdp.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.banking.sdp.backend.model.Staff;
import com.banking.sdp.backend.repository.StaffRepository;

@Service
public class StaffServiceImpl implements StaffService {

    @Autowired
    private StaffRepository staffRepository;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Override
    public Staff checkStaffLogin(String username, String password) {
        java.util.Optional<Staff> opt = staffRepository.findByUsername(username);
        if (opt.isPresent()) {
            Staff s = opt.get();
            if (passwordEncoder.matches(password, s.getPassword())) {
                return s;
            }
            if (password.equals(s.getPassword())) {
                s.setPassword(passwordEncoder.encode(password));
                staffRepository.save(s);
                return s;
            }
        }
        return null;
    }

    @Override
    public Staff getStaffProfile(Long staffId) {
        return staffRepository.findById(staffId).orElse(null);
    }

    @Override
    public String registerStaff(Staff staff) {
        if (staffRepository.existsByUsername(staff.getUsername())) {
            return "Username already exists! Please choose another one.";
        }
        if (staffRepository.existsByEmail(staff.getEmail())) {
            return "Email already exists! Please use a different email.";
        }
        if (staffRepository.existsByPhone(staff.getPhone())) {
            return "Phone number already exists! Please use a different one.";
        }

        if (staff.getPassword() != null) {
            staff.setPassword(passwordEncoder.encode(staff.getPassword()));
        }

        staffRepository.save(staff);
        return "Staff Registered Successfully";
    }
}
