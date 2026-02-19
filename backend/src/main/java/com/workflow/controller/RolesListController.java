package com.workflow.controller;

import com.workflow.dto.RoleDto;
import com.workflow.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Read-only list of roles for workflow step assignment.
 * Any authenticated user can access (e.g. workflow designer dropdown).
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RolesListController {

    private final RoleService roleService;

    @GetMapping("/roles")
    public ResponseEntity<List<RoleDto>> listRoles() {
        return ResponseEntity.ok(roleService.getAllRolesUncached());
    }
}
