"""
RAG Chat API — mirrors rag/agent.py behavior as a streaming FastAPI router.
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.config import ANTHROPIC_API_KEY
from app.indexing.es_client import get_es_client, collection_index_name
from app.indexing.embeddings import embed
from app.indexing.qdrant_client import get_qdrant_client

from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage

logger = logging.getLogger(__name__)

CLAUDE_MODEL = "claude-haiku-4-5-20251001"
TOP_K = 5
MAX_HISTORY = 10

DEFAULT_COLLECTION_ID = "acf3a192-c113-4ae3-acba-994d300419dd"
COLLECTION_NAME = "documents"


def hybrid_retrieve(query: str, collection_id: str) -> list[dict]:
    es = get_es_client()
    qdrant = get_qdrant_client()
    index = collection_index_name(collection_id)

    if not es.indices.exists(index=index):
        return []

    # 1. Dense search
    vector = embed(query)
    qdrant_hits = qdrant.query_points(
        collection_name=COLLECTION_NAME,
        query=vector,
        limit=TOP_K,
    ).points

    # 2. BM25 search
    es_hits = es.search(
        index=index,
        query={"match": {"text": query}},
        size=TOP_K,
    )["hits"]["hits"]

    # 3. Build payload lookup
    docs: dict[str, dict] = {}
    for r in qdrant_hits:
        key = r.payload.get("filename", "") + "|" + r.payload.get("text", "")[:80]
        docs[key] = {
            "filename": r.payload.get("filename", "unknown"),
            "text": r.payload.get("text", ""),
            "doc_id": r.payload.get("doc_id"),
        }
    for h in es_hits:
        key = h["_source"].get("filename", "") + "|" + h["_source"].get("text", "")[:80]
        docs[key] = {
            "filename": h["_source"].get("filename", "unknown"),
            "text": h["_source"].get("text", ""),
            "doc_id": h["_source"].get("doc_id"),
        }

    # 4. RRF scoring
    rrf: dict[str, float] = {}
    for rank, r in enumerate(qdrant_hits):
        key = r.payload.get("filename", "") + "|" + r.payload.get("text", "")[:80]
        rrf[key] = rrf.get(key, 0.0) + 1.0 / (60 + rank + 1)
    for rank, h in enumerate(es_hits):
        key = h["_source"].get("filename", "") + "|" + h["_source"].get("text", "")[:80]
        rrf[key] = rrf.get(key, 0.0) + 1.0 / (60 + rank + 1)

    # 5. Sort and deduplicate by filename (same as agent.py)
    ranked = sorted(rrf.items(), key=lambda x: x[1], reverse=True)
    seen: set[str] = set()
    results = []
    for key, score in ranked:
        doc = docs[key]
        if doc["filename"] not in seen:
            seen.add(doc["filename"])
            results.append({**doc, "score": round(score, 4)})
        if len(results) >= TOP_K:
            break

    return results


def format_context(chunks: list[dict]) -> str:
    if not chunks:
        return "No relevant documents found."
    return "\n\n".join(
        f"[Source: {c['filename']} | score: {c['score']}]\n{c['text']}"
        for c in chunks
    )


prompt_template = ChatPromptTemplate.from_messages([
    ("system", """You are a document assistant.
Answer the user's question using ONLY the context below.
If the answer is not in the context, say "I couldn't find that in the documents."
Always mention the source filename when referencing information.

Context:
{context}"""),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{question}"),
])

llm = ChatAnthropic(model=CLAUDE_MODEL, temperature=0.2, max_tokens=1024)
chain = prompt_template | llm | StrOutputParser()


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []
    collection_id: Optional[str] = None


def create_chat_router() -> APIRouter:
    router = APIRouter()

    @router.post("/chat")
    async def chat(req: ChatRequest):
        if not ANTHROPIC_API_KEY:
            raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

        collection_id = req.collection_id or DEFAULT_COLLECTION_ID
        chunks = hybrid_retrieve(req.message, collection_id)
        sources = [{"filename": c["filename"], "score": c["score"], "doc_id": c.get("doc_id")} for c in chunks]
        context = format_context(chunks)

        history = req.history[-MAX_HISTORY:]
        chat_history = [
            HumanMessage(content=m["content"]) if m.get("role") == "user"
            else AIMessage(content=m["content"])
            for m in history
            if m.get("role") in ("user", "assistant")
        ]

        async def event_stream():
            try:
                async for token in chain.astream({
                    "context": context,
                    "chat_history": chat_history,
                    "question": req.message,
                }):
                    yield f"data: {json.dumps({'type': 'content', 'text': token})}\n\n"
            except Exception as e:
                logger.error(f"Chat stream error: {e}")
                yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
                return

            yield f"data: {json.dumps({'type': 'done', 'sources': sources})}\n\n"

        return StreamingResponse(event_stream(), media_type="text/event-stream")

    return router
