package com.workflow.service;

import com.workflow.dto.RoleDto;
import com.workflow.exception.BadRequestException;
import com.workflow.exception.ResourceNotFoundException;
import com.workflow.model.Role;
import com.workflow.model.User;
import com.workflow.config.CaffeineCacheConfig;
import com.workflow.repository.RoleRepository;
import com.workflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoleService {

    private static final int ROLES_MAX_SIZE = 500;

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    @Qualifier("caffeineCacheManager")
    private final CacheManager cacheManager;

    @Cacheable(value = "roles")
    @Transactional(readOnly = true)
    public List<RoleDto> getAllRoles() {
        return roleRepository.findAll(PageRequest.of(0, ROLES_MAX_SIZE)).stream().map(this::toDto).collect(Collectors.toList());
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
        evictUserDetailsCache(user.getUsername());
    }

    @Transactional
    public void removeRoleFromUser(Long userId, Long roleId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        user.getRoles().removeIf(r -> r.getId().equals(roleId));
        userRepository.save(user);
        evictUserDetailsCache(user.getUsername());
    }

    private void evictUserDetailsCache(String username) {
        var cache = cacheManager.getCache(CaffeineCacheConfig.USER_DETAILS_CACHE);
        if (cache != null) {
            cache.evict(username);
        }
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
