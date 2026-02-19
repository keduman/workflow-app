package com.workflow.controller;

import com.workflow.dto.RoleDto;
import com.workflow.dto.UserDto;
import com.workflow.service.RoleService;
import com.workflow.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/roles")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class RoleController {

    private final RoleService roleService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<RoleDto>> getAll() {
        return ResponseEntity.ok(roleService.getAllRoles());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoleDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(roleService.getRole(id));
    }

    @PostMapping
    public ResponseEntity<RoleDto> create(@Valid @RequestBody RoleDto dto) {
        return ResponseEntity.ok(roleService.createRole(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RoleDto> update(@PathVariable Long id, @Valid @RequestBody RoleDto dto) {
        return ResponseEntity.ok(roleService.updateRole(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        roleService.deleteRole(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{roleId}/users/{userId}")
    public ResponseEntity<Void> assignRole(@PathVariable Long roleId, @PathVariable Long userId) {
        roleService.assignRoleToUser(userId, roleId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{roleId}/users/{userId}")
    public ResponseEntity<Void> removeRole(@PathVariable Long roleId, @PathVariable Long userId) {
        roleService.removeRoleFromUser(userId, roleId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/users")
    public ResponseEntity<Page<UserDto>> getAllUsers(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(userService.getAllUsers(pageable));
    }
}
