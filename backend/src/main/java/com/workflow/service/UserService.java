package com.workflow.service;

import com.workflow.dto.UserDto;
import com.workflow.exception.ResourceNotFoundException;
import com.workflow.model.Role;
import com.workflow.model.User;
import com.workflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public Page<UserDto> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public UserDto getUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
        return toDto(user);
    }

    @Transactional(readOnly = true)
    public UserDto getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
        return toDto(user);
    }

    private UserDto toDto(User user) {
        return new UserDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.isEnabled(),
                user.getRoles().stream().map(Role::getName).collect(Collectors.toUnmodifiableSet())
        );
    }
}
