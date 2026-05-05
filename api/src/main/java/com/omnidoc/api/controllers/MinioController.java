package com.omnidoc.api.controllers;

import com.omnidoc.api.services.MinioService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class MinioController {

    private final MinioService minioService;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listFiles(
            @RequestParam(required = false, defaultValue = "") String prefix) {
        try {
            return ResponseEntity.ok(minioService.listFiles(prefix));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/upload")
    public ResponseEntity<String> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            String path = minioService.uploadFile(file);
            return ResponseEntity.ok(path);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    @GetMapping("/download/{*path}")
    public ResponseEntity<byte[]> downloadFile(@PathVariable String path) {
        try {
            InputStream stream = minioService.downloadFile(path);
            byte[] bytes = stream.readAllBytes();
            stream.close();
            String filename = path.substring(path.lastIndexOf('/') + 1);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(bytes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @DeleteMapping("/{*path}")
    public ResponseEntity<Void> deleteFile(@PathVariable String path) {
        try {
            minioService.deleteFile(path);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
