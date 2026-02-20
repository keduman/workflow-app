package com.workflow.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

@Entity
@Table(name = "roles", uniqueConstraints = @UniqueConstraint(columnNames = "name"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(length = 255)
    private String description;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "role_permissions", joinColumns = @JoinColumn(name = "role_id"))
    @Column(name = "permission")
    @Builder.Default
    private Set<String> permissions = new HashSet<>();

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Role other)) return false;
        return name != null && name.equals(other.name);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(name);
    }
}
