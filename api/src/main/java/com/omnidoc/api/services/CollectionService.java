package com.omnidoc.api.services;

import com.omnidoc.api.modles.Collection;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CollectionService {

    private final JdbcTemplate jdbc;

    private final RowMapper<Collection> rowMapper = (rs, rowNum) -> {
        Collection c = new Collection();
        c.setId(UUID.fromString(rs.getString("id")));
        c.setName(rs.getString("name"));
        c.setDescription(rs.getString("description"));
        c.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        c.setUpdatedAt(rs.getTimestamp("updated_at").toLocalDateTime());
        return c;
    };

    public List<Collection> findAll() {
        String sql = "SELECT id, name, description, created_at, updated_at FROM collections";
        return jdbc.query(sql, rowMapper);
    }

    public Collection findById(UUID id) {
        String sql = "SELECT id, name, description, created_at, updated_at FROM collections WHERE id = ?";
        List<Collection> results = jdbc.query(sql, rowMapper, id);
        if (results.isEmpty()) throw new RuntimeException("Collection not found: " + id);
        return results.get(0);
    }

    public Collection create(Collection collection) {
        String sql = "INSERT INTO collections (id, name, description, created_at, updated_at) VALUES (?::uuid, ?, ?, ?, ?)";
        UUID newId = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();
        jdbc.update(sql, newId.toString(), collection.getName(), collection.getDescription(), now, now);
        collection.setId(newId);
        collection.setCreatedAt(now);
        collection.setUpdatedAt(now);
        return collection;
    }

    public Collection update(UUID id, Collection updated) {
        String sql = "UPDATE collections SET name = ?, description = ?, updated_at = ? WHERE id = ?::uuid";
        LocalDateTime now = LocalDateTime.now();
        int rows = jdbc.update(sql, updated.getName(), updated.getDescription(), now, id.toString());
        if (rows == 0) throw new RuntimeException("Collection not found: " + id);
        return findById(id);
    }

    public void delete(UUID id) {
        String sql = "DELETE FROM collections WHERE id = ?::uuid";
        jdbc.update(sql, id.toString());
    }
}