package com.omnidoc.api.controllers;

import com.omnidoc.api.modles.ChatMessage;
import com.omnidoc.api.modles.ChatSession;
import com.omnidoc.api.modles.User;
import com.omnidoc.api.services.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @GetMapping("/sessions")
    public List<Map<String, Object>> getSessions(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return chatService.getUserSessions(user);
    }

    @PostMapping("/sessions")
    public ChatSession createSession(Authentication authentication, @RequestBody(required = false) Map<String, String> body) {
        User user = (User) authentication.getPrincipal();
        String title = body != null ? body.get("title") : null;
        return chatService.createSession(user, title);
    }

    @GetMapping("/sessions/{id}")
    public Map<String, Object> getSession(Authentication authentication, @PathVariable UUID id) {
        User user = (User) authentication.getPrincipal();
        ChatSession session = chatService.getSession(user, id);
        List<ChatMessage> messages = chatService.getSessionMessages(id);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", session.getId());
        result.put("title", session.getTitle());
        result.put("createdAt", session.getCreatedAt());
        result.put("updatedAt", session.getUpdatedAt());
        result.put("messages", messages);
        return result;
    }

    @PutMapping("/sessions/{id}")
    public ChatSession updateSession(Authentication authentication, @PathVariable UUID id, @RequestBody Map<String, String> body) {
        User user = (User) authentication.getPrincipal();
        String title = body.get("title");
        return chatService.updateSessionTitle(user, id, title);
    }

    @DeleteMapping("/sessions/{id}")
    public ResponseEntity<Void> deleteSession(Authentication authentication, @PathVariable UUID id) {
        User user = (User) authentication.getPrincipal();
        chatService.deleteSession(user, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/sessions/{id}/messages")
    public ChatMessage addMessage(Authentication authentication, @PathVariable UUID id, @RequestBody Map<String, String> body) {
        User user = (User) authentication.getPrincipal();
        String role = body.get("role");
        String content = body.get("content");
        String sources = body.get("sources");
        return chatService.addMessage(user, id, role, content, sources);
    }
}
