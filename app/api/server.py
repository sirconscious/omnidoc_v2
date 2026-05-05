from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import logging

from app.core.config import QDRANT_HOST, QDRANT_PORT
from app.indexing.es_client import get_es_client, collection_index_name
from app.indexing.embeddings import embed
from app.indexing.qdrant_client import get_qdrant_client

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
            "filename": hit["_source"].get("filename"),
            "text": hit["_source"].get("text", "")[:500],
            "score": hit["_score"],
            "chunk_index": hit["_source"].get("chunk_index"),
            "has_table": hit["_source"].get("has_table", False),
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
            "filename": hit.payload.get("filename"),
            "text": hit.payload.get("text", "")[:500],
            "score": hit.score,
            "chunk_index": hit.payload.get("chunk_index"),
        })
    
    return {"results": results, "total": len(results)}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
