package com.omnidoc.api.services;

import com.omnidoc.api.modles.Collection;
import com.omnidoc.api.repositories.CollectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CollectionService {

    private final CollectionRepository collectionRepository;

    public List<Collection> findAll() {
        return collectionRepository.findAll();
    }

    public Collection findById(UUID id) {
        return collectionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Collection not found: " + id));
    }

    public Collection create(Collection collection) {
        return collectionRepository.save(collection);
    }

    public Collection update(UUID id, Collection updated) {
        Collection existing = findById(id);
        existing.setName(updated.getName());
        existing.setDescription(updated.getDescription());
        return collectionRepository.save(existing);
    }

    public void delete(UUID id) {
        collectionRepository.deleteById(id);
    }
}
