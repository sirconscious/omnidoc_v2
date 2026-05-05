package com.omnidoc.api.controllers;


import com.omnidoc.api.modles.Document;
import com.omnidoc.api.services.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DocumentController {

    private final com.omnidoc.api.services.DocumentService documentService;

    // GET all documents across all collections
    @GetMapping("/documents")
    public List<com.omnidoc.api.modles.Document> getAll() {
        return documentService.findAll();
    }

    // GET all documents in a specific collection
    @GetMapping("/collections/{collectionId}/documents")
    public List<Document> getByCollection(@PathVariable UUID collectionId) {
        return documentService.findByCollection(collectionId);
    }

    @GetMapping("/documents/{id}")
    public Document getById(@PathVariable UUID id) {
        return documentService.findById(id);
    }

    @PostMapping("/collections/{collectionId}/documents")
    public Document create(@PathVariable UUID collectionId, @RequestBody Document document) {
        return documentService.create(collectionId, document);
    }

    @PutMapping("/documents/{id}")
    public Document update(@PathVariable UUID id, @RequestBody Document document) {
        return documentService.update(id, document);
    }

    @DeleteMapping("/documents/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        documentService.delete(id);
        return ResponseEntity.noContent().build();
    }
}