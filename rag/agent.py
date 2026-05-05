"""
RAG Chat Agent — rag/agent.py
Run from project root: python -m rag.agent
"""

import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.indexing.embeddings import embed
from app.indexing.es_client import get_es_client

from qdrant_client import QdrantClient
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────

QDRANT_HOST     = "localhost"
QDRANT_PORT     = 6333
COLLECTION_NAME = "documents"
ES_INDEX        = "omnidoc_acf3a192-c113-4ae3-acba-994d300419dd"
CLAUDE_MODEL    = "claude-haiku-4-5-20251001"
TOP_K           = 5
MAX_HISTORY     = 10

# ─────────────────────────────────────────────
# CLIENTS
# ─────────────────────────────────────────────

qdrant = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
es     = get_es_client()

# ─────────────────────────────────────────────
# HYBRID SEARCH WITH RRF
# ─────────────────────────────────────────────

def retrieve(query: str) -> list[dict]:
    # 1. Dense search
    vector = embed(query)
    qdrant_hits = qdrant.query_points(
        collection_name=COLLECTION_NAME,
        query=vector,
        limit=TOP_K,
    ).points

    # 2. BM25 search
    es_hits = es.search(
        index=ES_INDEX,
        query={"match": {"text": query}},
        size=TOP_K,
    )["hits"]["hits"]

    # 3. Build payload lookup
    docs: dict[str, dict] = {}
    for r in qdrant_hits:
        key = r.payload.get("filename", "") + "|" + r.payload.get("text", "")[:80]
        docs[key] = {"filename": r.payload.get("filename"), "text": r.payload.get("text", "")}
    for h in es_hits:
        key = h["_source"].get("filename", "") + "|" + h["_source"].get("text", "")[:80]
        docs[key] = {"filename": h["_source"].get("filename"), "text": h["_source"].get("text", "")}

    # 4. RRF scoring
    rrf: dict[str, float] = {}
    for rank, r in enumerate(qdrant_hits):
        key = r.payload.get("filename", "") + "|" + r.payload.get("text", "")[:80]
        rrf[key] = rrf.get(key, 0.0) + 1.0 / (60 + rank + 1)
    for rank, h in enumerate(es_hits):
        key = h["_source"].get("filename", "") + "|" + h["_source"].get("text", "")[:80]
        rrf[key] = rrf.get(key, 0.0) + 1.0 / (60 + rank + 1)

    # 5. Sort and deduplicate by filename
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

# ─────────────────────────────────────────────
# LLM CHAIN
# ─────────────────────────────────────────────

prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a document assistant.
Answer the user's question using ONLY the context below.
If the answer is not in the context, say "I couldn't find that in the documents."
Always mention the source filename when referencing information.

Context:
{context}"""),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{question}"),
])

llm   = ChatAnthropic(model=CLAUDE_MODEL, temperature=0.2, max_tokens=1024)
chain = prompt | llm | StrOutputParser()

# ─────────────────────────────────────────────
# CHAT LOOP
# ─────────────────────────────────────────────

def chat() -> None:
    print("\n" + "═" * 50)
    print("  Omnidoc RAG Agent  |  Hybrid Search + Claude")
    print("  'exit' to quit  |  'clear' to reset memory")
    print("═" * 50 + "\n")

    chat_history: list = []

    while True:
        try:
            user_input = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        if not user_input:
            continue
        if user_input.lower() in ("exit", "quit"):
            print("Goodbye!")
            break
        if user_input.lower() == "clear":
            chat_history.clear()
            print("[memory cleared]\n")
            continue

        chunks = retrieve(user_input)

        print("\n📎 Sources:")
        for c in chunks:
            print(f"   {c['filename']}  (score: {c['score']})")
        print()

        answer = chain.invoke({
            "context":      format_context(chunks),
            "chat_history": chat_history[-MAX_HISTORY:],
            "question":     user_input,
        })

        print(f"Agent: {answer}\n")

        chat_history.append(HumanMessage(content=user_input))
        chat_history.append(AIMessage(content=answer))
        if len(chat_history) > MAX_HISTORY:
            chat_history = chat_history[-MAX_HISTORY:]


if __name__ == "__main__":
    chat()