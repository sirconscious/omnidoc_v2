package com.omnidoc.api.services;

import com.omnidoc.api.modles.ChatMessage;
import com.omnidoc.api.modles.ChatSession;
import com.omnidoc.api.modles.User;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final JdbcTemplate jdbc;

    private final RowMapper<ChatSession> sessionRowMapper = (rs, rowNum) -> {
        ChatSession s = new ChatSession();
        s.setId(UUID.fromString(rs.getString("id")));
        s.setTitle(rs.getString("title"));
        s.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        s.setUpdatedAt(rs.getTimestamp("updated_at").toLocalDateTime());
        // attach a shallow User with just the id
        User u = new User();
        u.setId(rs.getInt("user_id"));
        s.setUser(u);
        return s;
    };

    private final RowMapper<ChatMessage> messageRowMapper = (rs, rowNum) -> {
        ChatMessage m = new ChatMessage();
        m.setId(UUID.fromString(rs.getString("id")));
        m.setRole(rs.getString("role"));
        m.setContent(rs.getString("content"));
        m.setSources(rs.getString("sources"));
        m.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        // attach a shallow session with just the id
        ChatSession s = new ChatSession();
        s.setId(UUID.fromString(rs.getString("session_id")));
        m.setSession(s);
        return m;
    };

    // ─────────────────────────────────────────────
    // SESSION OPERATIONS
    // ─────────────────────────────────────────────

    public ChatSession createSession(User user, String title) {
        String sql = "INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)";
        UUID newId = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();
        jdbc.update(sql, newId.toString(), user.getId(), title, now, now);
        ChatSession session = new ChatSession();
        session.setId(newId);
        session.setUser(user);
        session.setTitle(title);
        session.setCreatedAt(now);
        session.setUpdatedAt(now);
        return session;
    }

    public List<Map<String, Object>> getUserSessions(User user) {
        String sql = "SELECT id, user_id, title, created_at, updated_at FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC";
        List<ChatSession> sessions = jdbc.query(sql, sessionRowMapper, user.getId());
        return sessions.stream().map(s -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", s.getId());
            map.put("title", s.getTitle());
            map.put("createdAt", s.getCreatedAt());
            map.put("updatedAt", s.getUpdatedAt());
            map.put("messageCount", countMessagesBySessionId(s.getId()));

            List<ChatMessage> msgs = getSessionMessages(s.getId());
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
        String sql = "SELECT id, user_id, title, created_at, updated_at FROM chat_sessions WHERE id = ?";
        List<ChatSession> results = jdbc.query(sql, sessionRowMapper, sessionId.toString());
        if (results.isEmpty()) throw new RuntimeException("Session not found: " + sessionId);

        ChatSession session = results.get(0);
        if (!session.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Session not found: " + sessionId);
        }
        return session;
    }

    public ChatSession updateSessionTitle(User user, UUID sessionId, String title) {
        getSession(user, sessionId);
        String sql = "UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ?";
        jdbc.update(sql, title, LocalDateTime.now(), sessionId.toString());
        return getSession(user, sessionId);
    }

    @Transactional
    public void deleteSession(User user, UUID sessionId) {
        getSession(user, sessionId);
        jdbc.update("DELETE FROM chat_messages WHERE session_id = ?", sessionId.toString());
        jdbc.update("DELETE FROM chat_sessions WHERE id = ?", sessionId.toString());
    }


    // ─────────────────────────────────────────────
    // MESSAGE OPERATIONS
    // ─────────────────────────────────────────────


    public List<ChatMessage> getSessionMessages(UUID sessionId) {
        String sql = "SELECT id, session_id, role, content, sources, created_at FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC";
        return jdbc.query(sql, messageRowMapper, sessionId.toString());
    }

    public int countMessagesBySessionId(UUID sessionId) {
        String sql = "SELECT COUNT(*) FROM chat_messages WHERE session_id = ?";
        Integer count = jdbc.queryForObject(sql, Integer.class, sessionId.toString());
        return count != null ? count : 0;
    }


    @Transactional
    public ChatMessage addMessage(User user, UUID sessionId, String role, String content, String sources) {
        ChatSession session = getSession(user, sessionId);

        if ("user".equals(role) && session.getTitle() == null) {
            String autoTitle = content.length() > 80 ? content.substring(0, 80) + "..." : content;
            autoTitle = autoTitle.replace("\n", " ").trim();
            jdbc.update("UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ?",
                    autoTitle, LocalDateTime.now(), sessionId.toString());
        } else {
            jdbc.update("UPDATE chat_sessions SET updated_at = ? WHERE id = ?",
                    LocalDateTime.now(), sessionId.toString());
        }

        String sql = "INSERT INTO chat_messages (id, session_id, role, content, sources, created_at) VALUES (?, ?, ?, ?, ?, ?)";
        UUID newId = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();
        jdbc.update(sql, newId.toString(), sessionId.toString(), role, content, sources, now);

        ChatMessage message = new ChatMessage();
        message.setId(newId);
        message.setSession(session);
        message.setRole(role);
        message.setContent(content);
        message.setSources(sources);
        message.setCreatedAt(now);
        return message;
    }
}