from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import logging
import httpx

from app.core.config import QDRANT_HOST, QDRANT_PORT
from app.indexing.es_client import get_es_client, collection_index_name
from app.indexing.embeddings import embed
from app.indexing.qdrant_client import get_qdrant_client
from app.api.chat_api import create_chat_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DEFAULT_COLLECTION_ID = "acf3a192-c113-4ae3-acba-994d300419dd"

app = FastAPI(title="Omnidoc Search API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/search/keyword")
async def keyword_search(
    query: str = Query(..., description="Search query"),
    collection_id: Optional[str] = Query(None, description="Collection ID"),
    top_k: int = Query(5, description="Number of results")
):
    """Keyword search using Elasticsearch."""
    if collection_id is None:
        collection_id = DEFAULT_COLLECTION_ID
    
    es = get_es_client()
    index = collection_index_name(collection_id)
    
    if not es.indices.exists(index=index):
        return {"results": [], "total": 0, "message": f"Index {index} does not exist"}
    
    response = es.search(
        index=index,
        query={"match": {"text": query}},
        size=top_k
    )
    
    results = []
    for hit in response["hits"]["hits"]:
        results.append({
            "doc_id":         hit["_source"].get("doc_id"),
            "collection_id":  hit["_source"].get("collection_id"),
            "filename":       hit["_source"].get("filename"),
            "text":           hit["_source"].get("text", "")[:500],
            "score":          hit["_score"],
            "chunk_index":    hit["_source"].get("chunk_index"),
            "has_table":      hit["_source"].get("has_table", False),
        })

    return {"results": results, "total": len(results)}


@app.get("/search/semantic")
async def semantic_search(
    query: str = Query(..., description="Search query"),
    top_k: int = Query(5, description="Number of results")
):
    """Semantic search using Qdrant vector embeddings."""
    vector = embed(query)
    client = get_qdrant_client()
    
    search_results = client.query_points(
        collection_name="documents",
        query=vector,
        limit=top_k,
    ).points
    
    results = []
    for hit in search_results:
        results.append({
            "doc_id":         hit.payload.get("doc_id"),
            "collection_id":  hit.payload.get("collection_id"),
            "filename":       hit.payload.get("filename"),
            "text":           hit.payload.get("text", "")[:500],
            "score":          hit.score,
            "chunk_index":    hit.payload.get("chunk_index"),
        })

    return {"results": results, "total": len(results)}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/search/document/{doc_id}")
async def get_document_detail(doc_id: str):
    """Get full document detail from ES chunks + Spring Boot metadata."""
    es = get_es_client()

    # Scan all collection indexes for this doc_id
    all_chunks = []
    matched_collection_id = None

    # Try the default collection first
    for suffix in [""]:
        index = collection_index_name(DEFAULT_COLLECTION_ID)
        if es.indices.exists(index=index):
            response = es.search(
                index=index,
                query={"match": {"doc_id": doc_id}},
                size=10000,
            )
            if response["hits"]["total"]["value"] > 0:
                matched_collection_id = DEFAULT_COLLECTION_ID
                for hit in response["hits"]["hits"]:
                    all_chunks.append({
                        "chunk_index": hit["_source"].get("chunk_index", 0),
                        "text": hit["_source"].get("text", ""),
                        "has_table": hit["_source"].get("has_table", False),
                        "source_page": hit["_source"].get("source_page"),
                        "source_section": hit["_source"].get("source_section"),
                        "word_count": hit["_source"].get("word_count", 0),
                    })

    if not all_chunks:
        raise HTTPException(status_code=404, detail="Document not found in search index")

    # Sort chunks by index
    all_chunks.sort(key=lambda c: c["chunk_index"])

    full_text = "\n\n".join(c["text"] for c in all_chunks)

    # Fetch metadata from Spring Boot
    metadata = {}
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"http://localhost:8080/api/documents/{doc_id}",
                timeout=5.0,
            )
            if resp.status_code == 200:
                metadata = resp.json()
    except Exception:
        pass

    return {
        "doc_id": doc_id,
        "collection_id": matched_collection_id,
        "filename": metadata.get("filename"),
        "file_type": metadata.get("fileType"),
        "file_size": metadata.get("fileSize"),
        "minio_path": metadata.get("minioPath"),
        "status": metadata.get("status"),
        "word_count": metadata.get("wordCount"),
        "page_count": metadata.get("pageCount"),
        "created_at": metadata.get("createdAt"),
        "chunk_count": len(all_chunks),
        "full_text": full_text,
        "chunks": all_chunks,
    }


# ─────────────────────────────────────────────
# RAG Chat (LangChain-based, mirrors rag/agent.py)
# ─────────────────────────────────────────────

app.include_router(create_chat_router())
