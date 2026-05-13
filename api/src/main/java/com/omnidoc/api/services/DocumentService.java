package com.omnidoc.api.services;

import com.omnidoc.api.modles.Collection;
import com.omnidoc.api.modles.Document;
import com.omnidoc.api.repositories.DocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final CollectionService collectionService;

    public List<Document> findAll() {
        return documentRepository.findAll();
    }

    public List<Document> findByCollection(UUID collectionId) {
        return documentRepository.findByCollectionId(collectionId);
    }

    public Document findById(UUID id) {
        return documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found: " + id));
    }

    public Document create(UUID collectionId, Document document) {
        Collection collection = collectionService.findById(collectionId);
        document.setCollection(collection);
        return documentRepository.save(document);
    }

    public Document update(UUID id, Document updated) {
        Document existing = findById(id);
        existing.setFilename(updated.getFilename());
        existing.setFileType(updated.getFileType());
        existing.setFileSize(updated.getFileSize());
        existing.setMinioPath(updated.getMinioPath());
        existing.setStatus(updated.getStatus());
        existing.setErrorMessage(updated.getErrorMessage());
        existing.setWordCount(updated.getWordCount());
        existing.setPageCount(updated.getPageCount());
        return documentRepository.save(existing);
    }

    public void delete(UUID id) {
        documentRepository.deleteById(id);
    }
}
