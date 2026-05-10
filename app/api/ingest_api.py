import os
import uuid
import json
import mimetypes
import re
import logging
import shutil
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel

from app.parsers.pdf_parser import parse_pdf
from app.parsers.csv_parser import parse_csv
from app.parsers.docx_parser import parse_docx
from app.storage.minio_client import upload_file as minio_upload
from app.models.document import insert_document, update_status, get_document, get_document_by_filename, update_document_minio_path
from app.indexing.es_indexer import index_document_chunks
from app.indexing.qdrant_indexer import index_chunks as qdrant_index_chunks

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CHUNK_OVERLAP_SENTENCES = 2
MAX_WORDS_PER_CHUNK = 200
DEFAULT_COLLECTION_ID = "acf3a192-c113-4ae3-acba-994d300419dd"

executor = ThreadPoolExecutor(max_workers=4)


def _get_sentences(text: str) -> list[str]:
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]


def _strip_table_from_overlap(text: str) -> str:
    lines = text.split("\n")
    filtered = []
    for line in lines:
        if line.startswith("|") or line.startswith("---"):
            continue
        filtered.append(line)
    return "\n".join(filtered)


def _add_overlap(chunks: list[dict], overlap_sentences: int = 2) -> list[dict]:
    if len(chunks) <= 1:
        return chunks
    result = [chunks[0].copy()]
    for i in range(1, len(chunks)):
        current = chunks[i].copy()
        previous_text = chunks[i - 1]["text"]
        sentences = _get_sentences(previous_text)
        overlap_text = " ".join(sentences[-overlap_sentences:])
        overlap_text = _strip_table_from_overlap(overlap_text)
        if overlap_text and current["text"]:
            current["text"] = f"{overlap_text} {current['text']}"
            current["word_count"] = len(current["text"].split())
            if "| " in overlap_text or "--- Table" in overlap_text:
                current["has_table"] = True
        result.append(current)
    return result


def _filter_and_clean_chunks(chunks: list[dict]) -> list[dict]:
    MIN_WORDS = 20
    filtered = []
    for chunk in chunks:
        text = chunk.get("text", "")
        text_lower = text.lower()
        if chunk.get("has_table", False):
            if "signature" in text_lower and ("date:" in text_lower or "_______" in text_lower):
                continue
        word_count = len(text.split())
        if word_count >= MIN_WORDS:
            filtered.append(chunk)
    if not filtered and chunks:
        max_chunk = max(chunks, key=lambda c: len(c.get("text", "").split()))
        filtered = [max_chunk]
    for i, chunk in enumerate(filtered):
        chunk["index"] = i
        chunk["word_count"] = len(chunk.get("text", "").split())
    return filtered


def _chunk_with_overlap(text: str, max_words: int = 200, file_type: str = None) -> list[dict]:
    if file_type == "csv":
        return []
    paragraphs = re.split(r"\n\s*\n", text)
    chunks = []
    current_chunk = []
    current_words = 0
    for para in paragraphs:
        words = para.split()
        if len(words) > max_words:
            if current_chunk:
                chunks.append({
                    "index": len(chunks), "text": " ".join(current_chunk),
                    "source_page": None, "source_section": None,
                    "has_table": False, "word_count": current_words,
                })
                current_chunk = []
                current_words = 0
            for i in range(0, len(words), max_words):
                chunk_text = " ".join(words[i:i + max_words])
                chunks.append({
                    "index": len(chunks), "text": chunk_text,
                    "source_page": None, "source_section": None,
                    "has_table": False, "word_count": len(chunk_text.split()),
                })
            continue
        if current_words + len(words) > max_words:
            chunks.append({
                "index": len(chunks), "text": " ".join(current_chunk),
                "source_page": None, "source_section": None,
                "has_table": False, "word_count": current_words,
            })
            current_chunk = []
            current_words = 0
        current_chunk.extend(words)
        current_words += len(words)
    if current_chunk:
        chunks.append({
            "index": len(chunks), "text": " ".join(current_chunk),
            "source_page": None, "source_section": None,
            "has_table": False, "word_count": current_words,
        })
    return chunks


def _parse_txt_md_json(file_path: Path) -> tuple:
    text = file_path.read_text(encoding="utf-8", errors="replace")
    chunks = _chunk_with_overlap(text)
    chunks = _add_overlap(chunks)
    metadata = {"word_count": len(text.split())}
    return text, metadata, chunks


def extract_text(file_path: Path, file_type: str):
    if file_type == "pdf":
        return parse_pdf(file_path)
    elif file_type == "csv":
        return parse_csv(file_path)
    elif file_type == "docx":
        return parse_docx(file_path)
    elif file_type in ("txt", "md", "json"):
        return _parse_txt_md_json(file_path)
    else:
        return "", {}


def build_document_json(
    doc_id: str, filename: str, file_type: str,
    raw_text: str, extra_meta: dict, file_path: Path,
    parser_chunks: list[dict] = None,
) -> dict:
    stat = file_path.stat()
    created_at = datetime.fromtimestamp(stat.st_ctime).strftime("%Y-%m-%d")
    if parser_chunks:
        chunks = _add_overlap(parser_chunks, CHUNK_OVERLAP_SENTENCES)
        chunks = _filter_and_clean_chunks(chunks)
    else:
        chunks = _chunk_with_overlap(raw_text, MAX_WORDS_PER_CHUNK, file_type)
        chunks = _add_overlap(chunks, CHUNK_OVERLAP_SENTENCES)
        chunks = _filter_and_clean_chunks(chunks)
    metadata = {
        "page_count": extra_meta.get("page_count"),
        "word_count": extra_meta.get("word_count", len(raw_text.split())),
        "created_at": created_at,
        "has_tables": extra_meta.get("has_tables", False),
        "author": extra_meta.get("author"),
        "title": extra_meta.get("title"),
    }
    for key in extra_meta:
        if key not in metadata or metadata[key] is None:
            metadata[key] = extra_meta[key]
    chunks = [c for c in chunks if c.get("word_count", 0) >= 20]
    for i, c in enumerate(chunks):
        c["index"] = i
    return {
        "id": doc_id, "filename": filename, "file_type": file_type,
        "raw_text": raw_text, "metadata": metadata, "chunks": chunks,
    }


def run_pipeline(file_path: Path, filename: str, collection_id: str, db_id: int) -> None:
    try:
        file_type = file_path.suffix.lstrip(".").lower() or "bin"
        file_size = file_path.stat().st_size
        mime_type, _ = mimetypes.guess_type(str(file_path))
        mime_type = mime_type or "application/octet-stream"

        update_status(db_id, "processing")

        file_bytes = file_path.read_bytes()
        minio_key = f"raw/{collection_id}/{db_id}/{filename}"
        minio_path = minio_upload(file_bytes, minio_key, mime_type)
        update_document_minio_path(db_id, minio_path)

        raw_text, extra_meta, parser_chunks = extract_text(file_path, file_type)

        doc_json = build_document_json(
            doc_id=str(db_id), filename=filename, file_type=file_type,
            raw_text=raw_text, extra_meta=extra_meta,
            file_path=file_path, parser_chunks=parser_chunks,
        )

        json_bytes = json.dumps(doc_json, ensure_ascii=False, indent=2).encode("utf-8")
        json_key = f"parsed/{collection_id}/{db_id}/{file_path.stem}.json"
        minio_upload(json_bytes, json_key, "application/json")

        es_result = index_document_chunks(
            doc_id=str(db_id), collection_id=collection_id,
            filename=filename, file_type=file_type,
            chunks=doc_json["chunks"],
        )
        if es_result["failed"] > 0:
            logger.warning(f"ES indexing had {es_result['failed']} chunk failures")

        qdrant_index_chunks(
            doc_id=str(db_id), filename=filename,
            collection_id=collection_id, chunks=doc_json["chunks"],
        )

        update_status(db_id, "indexed")
        logger.info(f"Ingest complete: db_id={db_id}, chunks={len(doc_json['chunks'])}")
    except Exception as exc:
        logger.error(f"Ingest pipeline failed for db_id={db_id}: {exc}")
        try:
            update_status(db_id, "error", str(exc))
        except Exception:
            pass
        raise
    finally:
        try:
            if file_path.exists():
                file_path.unlink()
        except Exception:
            pass


def ingest_file(file_bytes: bytes, filename: str, collection_id: str | None = None) -> int:
    if collection_id is None:
        collection_id = DEFAULT_COLLECTION_ID

    existing = get_document_by_filename(filename, collection_id)
    if existing:
        raise HTTPException(status_code=409, detail=f"Document '{filename}' already exists (id={existing['id']}, status={existing['status']})")

    file_type = Path(filename).suffix.lstrip(".").lower() or "bin"
    file_size = len(file_bytes)
    mime_type, _ = mimetypes.guess_type(filename)
    mime_type = mime_type or "application/octet-stream"

    db_id = insert_document(filename, file_type, file_size, None, collection_id)

    tmp_dir = Path("/tmp/omnidoc_ingest")
    tmp_dir.mkdir(parents=True, exist_ok=True)
    tmp_path = tmp_dir / f"{uuid.uuid4()}_{filename}"
    tmp_path.write_bytes(file_bytes)

    executor.submit(run_pipeline, tmp_path, filename, collection_id, db_id)
    return db_id


router = APIRouter()


@router.post("/ingest")
async def ingest_upload(file: UploadFile = File(...), collection_id: str = Form(None)):
    SUPPORTED = {".pdf", ".csv", ".docx", ".txt", ".md", ".json"}
    ext = Path(file.filename or "file").suffix.lower()
    if ext not in SUPPORTED:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{ext}'. Supported: {', '.join(sorted(SUPPORTED))}")

    file_bytes = await file.read()
    db_id = ingest_file(file_bytes, file.filename or "file", collection_id)
    return {"doc_id": str(db_id)}


@router.get("/ingest/{doc_id}/status")
async def ingest_status(doc_id: str):
    doc = get_document(doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"doc_id": doc_id, "status": doc["status"], "error_message": doc.get("error_message")}
