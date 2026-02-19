package com.workflow.controller;

import com.workflow.dto.UserDto;
import com.workflow.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserDto> getCurrentUser(Authentication auth) {
        return ResponseEntity.ok(userService.getUserByUsername(auth.getName()));
    }
}
