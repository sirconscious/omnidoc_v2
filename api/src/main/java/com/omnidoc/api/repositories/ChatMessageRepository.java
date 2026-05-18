package com.omnidoc.api.repositories;

import com.omnidoc.api.modles.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
    List<ChatMessage> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);
    int countBySessionId(UUID sessionId);
    void deleteBySessionId(UUID sessionId);
}
