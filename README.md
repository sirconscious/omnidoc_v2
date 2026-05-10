# Omnidoc — Document Intelligence Platform

Upload, search, and chat with your documents using hybrid keyword + semantic retrieval powered by LLMs.

## Features

- **Multi-format ingestion** — PDF, DOCX, CSV, TXT, MD, JSON (drag-and-drop files or folders)
- **Hybrid search** — combines BM25 keyword matching (Elasticsearch) with dense vector embeddings (Qdrant) via Reciprocal Rank Fusion
- **RAG Chat** — ask natural-language questions, get Claude Haiku answers with clickable source citations
- **Document detail** — view full text with chunk-by-chunk navigation, metadata, and download originals
- **Dashboard** — manage collections, documents, track ingestion status
- **Authentication** — JWT-based login/register with route guards

## Architecture

```
┌──────────┐     ┌──────────────┐     ┌───────────────┐
│  Next.js  │────→│  Spring Boot  │────→│   PostgreSQL   │
│  :3000    │  │  │  :8080        │     │  (metadata)    │
└──────────┘   │  └──────────────┘     └───────────────┘
   │    │      │         │                    ▲
   │    └────────────    │                    │
   │              ▼      ▼                    │
   │         ┌──────────────────┐             │
   │         │    FastAPI       │─────────────┘
   └────────→│  :8000           │──→ Elasticsearch (:9200)
              │  (search/chat    │──→ Qdrant (:6333)
              │   /ingest)       │──→ MinIO (:9000)
              └──────────────────┘
```

### Services

| Service | Port | Role |
|---------|------|------|
| **Next.js** | 3000 | Frontend (React 19, Tailwind, shadcn/ui) + API proxy |
| **Spring Boot** | 8080 | Auth (JWT), CRUD for collections/documents, file download |
| **FastAPI** | 8000 | Keyword/vector search, SSE chat streaming, ingestion API |
| **PostgreSQL** | 5432 | Metadata: documents, collections, users |
| **Elasticsearch** | 9200 | Full-text keyword index (one per collection) |
| **Qdrant** | 6333 | Dense vector search (768-dim embeddings, cosine distance) |
| **MinIO** | 9000 | S3-compatible object storage (raw files + parsed JSON) |

## Getting Started

### Prerequisites

- Python 3.11+
- Java 17+ (for Spring Boot)
- Node.js 20+
- Docker (for running services)

### 1. Start infrastructure

```bash
# PostgreSQL, Elasticsearch, Qdrant, MinIO
docker compose up -d postgres es qdrant minio
```

### 2. Backend setup

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # edit with your credentials
```

### 3. Start Spring Boot

```bash
cd spring-backend
./mvnw spring-boot:run
```

### 4. Start FastAPI

```bash
python run_api.py
# → http://0.0.0.0:8000
```

### 5. Start Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### 6. Ingest documents

**CLI:**
```bash
python main.py
# → choose file or directory
```

**Web UI:**
Navigate to http://localhost:3000/upload and drag-and-drop files or folders.

## Ingestion Pipeline

```
[1] Upload raw file → MinIO
[2] Insert metadata → PostgreSQL (status: pending)
[3] Extract text    → Parser (PDF/DOCX/CSV/TXT/MD)
[4] Chunk + overlap + filter → Upload parsed JSON → MinIO
[5] Index chunks    → Elasticsearch (keyword)
[6] Embed + index   → Qdrant (vector search)
[7] Update status   → PostgreSQL (status: indexed)
```

### Parsers

| Format | Library | Features |
|--------|---------|----------|
| PDF | pdfplumber (+ tesseract OCR fallback) | Page extraction, table → markdown, metadata |
| DOCX | python-docx | Paragraphs, headers/footers, text boxes, tables, resume detection |
| CSV | csv module | Auto-delimiter detection, column typing, numeric summaries, 50-row chunks |
| TXT/MD/JSON | built-in | Paragraph-aware, 200-word chunks |

### Chunking

- **Overlap**: last 2 sentences of previous chunk prepended (table lines stripped)
- **Filter**: drop chunks <20 words, drop signature table chunks ("signature" + "date:")
- **Deduplication**: RRF fusion keeps at most 1 chunk per filename in chat retrieval

## Search

Two modes, merged via RRF:

```
Keyword:  ES "match" query on "text" field → BM25 score
Semantic: sentence-transformers → Qdrant cosine similarity
Result:   RRF score = Σ 1/(60 + rank) across both result sets
```

## Chat (RAG)

```
User query → HybridRetrieve (top 5 chunks) → Claude Haiku → SSE stream
```

- Uses Claude Haiku-4-5 (`claude-haiku-4-5-20251001`)
- Maintains conversation history (last 10 turns)
- Returns source citations with clickable document links
- Streaming via server-sent events

## API Endpoints

### FastAPI (:8000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/search/keyword` | GET | BM25 keyword search |
| `/search/semantic` | GET | Dense vector search |
| `/search/document/{id}` | GET | Full document detail (chunks + metadata) |
| `/chat` | POST | Streaming RAG chat (SSE) |
| `/ingest` | POST | Upload + ingest file |
| `/ingest/{id}/status` | GET | Poll ingestion status |
| `/health` | GET | Health check |

### Spring Boot (:8080)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register user |
| `/api/auth/authenticate` | POST | Login, returns JWT |
| `/api/collections` | GET/POST | List / create collections |
| `/api/collections/{id}` | GET/PUT/DELETE | CRUD |
| `/api/documents` | GET | List documents |
| `/api/documents/{id}` | GET/PUT/DELETE | CRUD |
| `/api/files/upload` | POST | Upload file |
| `/api/files/download/{path}` | GET | Download file (auth required) |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui |
| Auth + CRUD | Spring Boot (Java), JWT |
| Search + Chat | FastAPI (Python), LangChain |
| LLM | Anthropic Claude Haiku |
| Embeddings | sentence-transformers (`all-mpnet-base-v2`) |
| Keyword index | Elasticsearch |
| Vector index | Qdrant |
| Metadata | PostgreSQL |
| File storage | MinIO (S3-compatible) |

## Project Structure

```
omnidoc/
├── app/
│   ├── api/           # FastAPI routes (server.py, chat_api.py, ingest_api.py)
│   ├── core/          # Config, database connection
│   ├── indexing/      # ES client/indexer, Qdrant client/indexer, embeddings
│   ├── models/        # Document/collection DB models
│   ├── parsers/       # PDF, CSV, DOCX parsers
│   └── storage/       # MinIO client
├── frontend/
│   ├── app/           # Next.js pages (chat, dashboard, document, upload)
│   ├── components/    # UI components (sidebar, dashboard panels)
│   ├── contexts/      # Auth context
│   └── lib/           # API clients, auth helpers
├── main.py            # CLI ingestion entry point
├── run_api.py         # FastAPI server launcher
└── requirements.txt
```

## License

MIT
