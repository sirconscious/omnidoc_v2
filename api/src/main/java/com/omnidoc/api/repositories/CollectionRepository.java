package com.omnidoc.api.repositories;


import com.omnidoc.api.modles.Collection;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface CollectionRepository extends JpaRepository<com.omnidoc.api.modles.Collection, UUID> {
}