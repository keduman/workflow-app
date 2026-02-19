package com.workflow.service;

import com.workflow.dto.RoleDto;
import com.workflow.exception.BadRequestException;
import com.workflow.exception.ResourceNotFoundException;
import com.workflow.model.Role;
import com.workflow.model.User;
import com.workflow.repository.RoleRepository;
import com.workflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoleService {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;

    @Cacheable(value = "roles")
    @Transactional(readOnly = true)
    public List<RoleDto> getAllRoles() {
        return roleRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    /** Uncached list for assignment dropdowns; avoids cache manager issues in all profiles. */
    @Transactional(readOnly = true)
    public List<RoleDto> getAllRolesUncached() {
        return roleRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Cacheable(value = "roles", key = "#id")
    @Transactional(readOnly = true)
    public RoleDto getRole(Long id) {
        return toDto(roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + id)));
    }

    @CacheEvict(value = "roles", allEntries = true)
    @Transactional
    public RoleDto createRole(RoleDto dto) {
        if (roleRepository.existsByName(dto.getName())) {
            throw new BadRequestException("Role already exists: " + dto.getName());
        }
        Role role = Role.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .permissions(dto.getPermissions() != null ? dto.getPermissions() : Set.of())
                .build();
        return toDto(roleRepository.save(role));
    }

    @CacheEvict(value = "roles", allEntries = true)
    @Transactional
    public RoleDto updateRole(Long id, RoleDto dto) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + id));
        role.setName(dto.getName());
        role.setDescription(dto.getDescription());
        if (dto.getPermissions() != null) {
            role.setPermissions(dto.getPermissions());
        }
        return toDto(roleRepository.save(role));
    }

    @CacheEvict(value = "roles", allEntries = true)
    @Transactional
    public void deleteRole(Long id) {
        if (!roleRepository.existsById(id)) {
            throw new ResourceNotFoundException("Role not found: " + id);
        }
        roleRepository.deleteById(id);
    }

    @Transactional
    public void assignRoleToUser(Long userId, Long roleId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleId));
        user.getRoles().add(role);
        userRepository.save(user);
    }

    @Transactional
    public void removeRoleFromUser(Long userId, Long roleId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        user.getRoles().removeIf(r -> r.getId().equals(roleId));
        userRepository.save(user);
    }

    private RoleDto toDto(Role role) {
        return RoleDto.builder()
                .id(role.getId())
                .name(role.getName())
                .description(role.getDescription())
                .permissions(role.getPermissions())
                .build();
    }
}
