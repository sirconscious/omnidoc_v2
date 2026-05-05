package com.omnidoc.api.services;

import io.minio.*;
import io.minio.messages.Item;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class MinioService {

    private final MinioClient minioClient;

    @Value("${minio.bucket}")
    private String bucket;

    public MinioService(MinioClient minioClient) {
        this.minioClient = minioClient;
    }

    public void ensureBucket() throws Exception {
        boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
        if (!exists) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
        }
    }

    public String uploadFile(MultipartFile file) throws Exception {
        ensureBucket();
        minioClient.putObject(
                PutObjectArgs.builder()
                        .bucket(bucket)
                        .object(file.getOriginalFilename())
                        .stream(file.getInputStream(), file.getSize(), -1)
                        .contentType(file.getContentType())
                        .build()
        );
        return file.getOriginalFilename();
    }

    public List<Map<String, Object>> listFiles(String prefix) throws Exception {
        ensureBucket();
        List<Map<String, Object>> files = new ArrayList<>();
        var results = minioClient.listObjects(
                ListObjectsArgs.builder()
                        .bucket(bucket)
                        .prefix(prefix != null ? prefix : "")
                        .recursive(true)
                        .build()
        );
        for (var result : results) {
            Item item = result.get();
            files.add(Map.of(
                    "name", item.objectName(),
                    "size", item.size(),
                    "lastModified", item.lastModified()
            ));
        }
        return files;
    }

    public InputStream downloadFile(String objectName) throws Exception {
        return minioClient.getObject(
                GetObjectArgs.builder()
                        .bucket(bucket)
                        .object(objectName)
                        .build()
        );
    }

    public void deleteFile(String objectName) throws Exception {
        minioClient.removeObject(
                RemoveObjectArgs.builder()
                        .bucket(bucket)
                        .object(objectName)
                        .build()
        );
    }
}
