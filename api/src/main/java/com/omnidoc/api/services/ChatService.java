package com.omnidoc.api.services;

import com.omnidoc.api.modles.ChatMessage;
import com.omnidoc.api.modles.ChatSession;
import com.omnidoc.api.modles.User;
import com.omnidoc.api.repositories.ChatMessageRepository;
import com.omnidoc.api.repositories.ChatSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatSessionRepository sessionRepository;
    private final ChatMessageRepository messageRepository;

    public ChatSession createSession(User user, String title) {
        ChatSession session = new ChatSession();
        session.setUser(user);
        session.setTitle(title);
        return sessionRepository.save(session);
    }

    public List<Map<String, Object>> getUserSessions(User user) {
        List<ChatSession> sessions = sessionRepository.findByUserIdOrderByUpdatedAtDesc(user.getId());
        return sessions.stream().map(s -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", s.getId());
            map.put("title", s.getTitle());
            map.put("createdAt", s.getCreatedAt());
            map.put("updatedAt", s.getUpdatedAt());
            map.put("messageCount", messageRepository.countBySessionId(s.getId()));

            List<ChatMessage> msgs = messageRepository.findBySessionIdOrderByCreatedAtAsc(s.getId());
            if (!msgs.isEmpty()) {
                ChatMessage last = msgs.get(msgs.size() - 1);
                Map<String, Object> lastMsg = new LinkedHashMap<>();
                lastMsg.put("role", last.getRole());
                lastMsg.put("content", last.getContent().length() > 100
                        ? last.getContent().substring(0, 100) : last.getContent());
                map.put("lastMessage", lastMsg);
            }

            return map;
        }).collect(Collectors.toList());
    }

    public ChatSession getSession(User user, UUID sessionId) {
        ChatSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));
        if (!session.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Session not found: " + sessionId);
        }
        return session;
    }

    public List<ChatMessage> getSessionMessages(UUID sessionId) {
        return messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
    }

    public ChatSession updateSessionTitle(User user, UUID sessionId, String title) {
        ChatSession session = getSession(user, sessionId);
        session.setTitle(title);
        return sessionRepository.save(session);
    }

    @Transactional
    public void deleteSession(User user, UUID sessionId) {
        ChatSession session = getSession(user, sessionId);
        messageRepository.deleteBySessionId(sessionId);
        sessionRepository.delete(session);
    }

    @Transactional
    public ChatMessage addMessage(User user, UUID sessionId, String role, String content, String sources) {
        ChatSession session = getSession(user, sessionId);

        if ("user".equals(role) && session.getTitle() == null) {
            String autoTitle = content.length() > 80 ? content.substring(0, 80) + "..." : content;
            autoTitle = autoTitle.replace("\n", " ").trim();
            session.setTitle(autoTitle);
            sessionRepository.save(session);
        }

        ChatMessage message = new ChatMessage();
        message.setSession(session);
        message.setRole(role);
        message.setContent(content);
        message.setSources(sources);
        return messageRepository.save(message);
    }
}
