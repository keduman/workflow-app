package com.workflow.service;

import com.workflow.dto.*;
import com.workflow.exception.BadRequestException;
import com.workflow.model.Role;
import com.workflow.model.User;
import com.workflow.repository.RoleRepository;
import com.workflow.repository.UserRepository;
import com.workflow.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new BadRequestException("Username already exists");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new BadRequestException("Email already exists");
        }

        Role userRole = roleRepository.findByName("USER")
                .orElseGet(() -> roleRepository
                        .save(Role.builder().name("USER").description("Default user role").build()));

        User user = User.builder()
                .username(request.username())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .fullName(request.fullName())
                .roles(Set.of(userRole))
                .build();

        userRepository.save(user);

        String accessToken = tokenProvider.generateAccessToken(user.getUsername());
        String refreshToken = tokenProvider.generateRefreshToken(user.getUsername());

        return new AuthResponse(
                accessToken,
                refreshToken,
                user.getUsername(),
                user.getEmail(),
                user.getRoles().stream().map(Role::getName).collect(Collectors.toUnmodifiableSet())
        );
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));

        String accessToken = tokenProvider.generateAccessToken(authentication);
        String refreshToken = tokenProvider.generateRefreshToken(request.username());

        User user = userRepository.findByUsername(request.username())
                .orElseThrow(() -> new BadRequestException("User not found"));

        return new AuthResponse(
                accessToken,
                refreshToken,
                user.getUsername(),
                user.getEmail(),
                user.getRoles().stream().map(Role::getName).collect(Collectors.toUnmodifiableSet())
        );
    }

    @Transactional(readOnly = true)
    public AuthResponse refreshToken(String refreshToken) {
        if (!tokenProvider.validateToken(refreshToken)) {
            throw new BadRequestException("Invalid refresh token");
        }
        String username = tokenProvider.getUsernameFromToken(refreshToken);
        String newAccessToken = tokenProvider.generateAccessToken(username);
        String newRefreshToken = tokenProvider.generateRefreshToken(username);

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadRequestException("User not found"));

        return new AuthResponse(
                newAccessToken,
                newRefreshToken,
                user.getUsername(),
                user.getEmail(),
                user.getRoles().stream().map(Role::getName).collect(Collectors.toUnmodifiableSet())
        );
    }

}
