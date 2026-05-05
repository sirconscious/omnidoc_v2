package com.omnidoc.api.controllers;



import com.omnidoc.api.modles.Collection;
import com.omnidoc.api.services.CollectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/collections")
@RequiredArgsConstructor
public class CollectionController {

    private final com.omnidoc.api.services.CollectionService collectionService;

    @GetMapping
    public List<com.omnidoc.api.modles.Collection> getAll() {
        return collectionService.findAll();
    }

    @GetMapping("/{id}")
    public Collection getById(@PathVariable UUID id) {
        return collectionService.findById(id);
    }

    @PostMapping
    public Collection create(@RequestBody Collection collection) {
        return collectionService.create(collection);
    }

    @PutMapping("/{id}")
    public Collection update(@PathVariable UUID id, @RequestBody Collection collection) {
        return collectionService.update(id, collection);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        collectionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}