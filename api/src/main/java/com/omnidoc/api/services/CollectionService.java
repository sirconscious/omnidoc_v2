package com.omnidoc.api.services;

import com.omnidoc.api.modles.Collection;
import com.omnidoc.api.repositories.CollectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CollectionService {

    private final CollectionRepository collectionRepository;

    @Cacheable(value = "collections")
    public List<Collection> findAll() {
        return collectionRepository.findAll();
    }

    @Cacheable(value = "collections", key = "#id")
    public Collection findById(UUID id) {
        return collectionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Collection not found: " + id));
    }

    @CacheEvict(value = "collections", allEntries = true)
    public Collection create(Collection collection) {
        return collectionRepository.save(collection);
    }

    @CachePut(value = "collections", key = "#id")
    @CacheEvict(value = "collections", allEntries = true)
    public Collection update(UUID id, Collection updated) {
        Collection existing = findById(id);
        existing.setName(updated.getName());
        existing.setDescription(updated.getDescription());
        return collectionRepository.save(existing);
    }

    @CacheEvict(value = "collections", allEntries = true)
    public void delete(UUID id) {
        collectionRepository.deleteById(id);
    }
}