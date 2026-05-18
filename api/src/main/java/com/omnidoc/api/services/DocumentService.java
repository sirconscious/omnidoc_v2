package com.omnidoc.api.services;

import com.omnidoc.api.modles.Collection;
import com.omnidoc.api.modles.Document;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private final JdbcTemplate jdbc;
    private final CollectionService collectionService;

    private final RowMapper<Document> rowMapper = (rs, rowNum) -> {
        Document d = new Document();
        d.setId(UUID.fromString(rs.getString("id")));
        d.setFilename(rs.getString("filename"));
        d.setFileType(rs.getString("file_type"));
        d.setFileSize(rs.getObject("file_size") != null ? rs.getInt("file_size") : null);
        d.setMinioPath(rs.getString("minio_path"));
        d.setStatus(rs.getString("status"));
        d.setErrorMessage(rs.getString("error_message"));
        d.setWordCount(rs.getObject("word_count") != null ? rs.getInt("word_count") : null);
        d.setPageCount(rs.getObject("page_count") != null ? rs.getInt("page_count") : null);
        d.setCreatedAt(rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toLocalDateTime() : null);
        d.setUpdatedAt(rs.getTimestamp("updated_at") != null ? rs.getTimestamp("updated_at").toLocalDateTime() : null);

        Collection col = new Collection();
        col.setId(UUID.fromString(rs.getString("collection_id")));
        d.setCollection(col);

        return d;
    };

    public List<Document> findAll() {
        String sql = """
                SELECT id, filename, file_type, file_size, minio_path, status,
                       error_message, word_count, page_count, created_at, updated_at, collection_id
                FROM documents
                """;
        return jdbc.query(sql, rowMapper);
    }

    public List<Document> findByCollection(UUID collectionId) {
        String sql = """
                SELECT id, filename, file_type, file_size, minio_path, status,
                       error_message, word_count, page_count, created_at, updated_at, collection_id
                FROM documents
                WHERE collection_id = ?
                """;
        return jdbc.query(sql, rowMapper, collectionId.toString());
    }

    public Document findById(UUID id) {
        String sql = """
                SELECT id, filename, file_type, file_size, minio_path, status,
                       error_message, word_count, page_count, created_at, updated_at, collection_id
                FROM documents
                WHERE id = ?
                """;
        List<Document> results = jdbc.query(sql, rowMapper, id.toString());
        if (results.isEmpty()) throw new RuntimeException("Document not found: " + id);
        return results.get(0);
    }

    public Document create(UUID collectionId, Document document) {
        // verify collection exists first
        collectionService.findById(collectionId);

        String sql = """
                INSERT INTO documents
                    (id, filename, file_type, file_size, minio_path, status, collection_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;
        UUID newId = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();
        jdbc.update(sql,
                newId.toString(),
                document.getFilename(),
                document.getFileType(),
                document.getFileSize(),
                document.getMinioPath(),
                document.getStatus() != null ? document.getStatus() : "pending",
                collectionId.toString(),
                now, now
        );

        document.setId(newId);
        document.setCreatedAt(now);
        document.setUpdatedAt(now);

        Collection col = new Collection();
        col.setId(collectionId);
        document.setCollection(col);

        return document;
    }

    public Document update(UUID id, Document updated) {
        String sql = """
                UPDATE documents
                SET filename      = ?,
                    file_type     = ?,
                    file_size     = ?,
                    minio_path    = ?,
                    status        = ?,
                    error_message = ?,
                    word_count    = ?,
                    page_count    = ?,
                    updated_at    = ?
                WHERE id = ?
                """;
        int rows = jdbc.update(sql,
                updated.getFilename(),
                updated.getFileType(),
                updated.getFileSize(),
                updated.getMinioPath(),
                updated.getStatus(),
                updated.getErrorMessage(),
                updated.getWordCount(),
                updated.getPageCount(),
                LocalDateTime.now(),
                id.toString()
        );
        if (rows == 0) throw new RuntimeException("Document not found: " + id);
        return findById(id);
    }

    public void delete(UUID id) {
        String sql = "DELETE FROM documents WHERE id = ?";
        jdbc.update(sql, id.toString());
    }
}