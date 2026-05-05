package com.omnidoc.api.repositories;

import com.omnidoc.api.modles.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<com.omnidoc.api.modles.Document, UUID> {
    List<Document> findByCollectionId(UUID collectionId);
}
