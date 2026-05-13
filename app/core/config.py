from dotenv import load_dotenv
import os

load_dotenv()

# MinIO
MINIO_HOST       = os.getenv("MINIO_HOST")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY")
MINIO_BUCKET     = os.getenv("MINIO_BUCKET", "omnidoc")

# SQL Server
SQLSERVER_HOST     = os.getenv("SQLSERVER_HOST", "localhost")
SQLSERVER_PORT     = os.getenv("SQLSERVER_PORT", "1433")
SQLSERVER_USER     = os.getenv("SQLSERVER_USER")
SQLSERVER_PASSWORD = os.getenv("SQLSERVER_PASSWORD")
SQLSERVER_DB       = os.getenv("SQLSERVER_DB")
SQLSERVER_DRIVER   = os.getenv("SQLSERVER_DRIVER", "ODBC Driver 18 for SQL Server")

# Elasticsearch
ES_HOST     = os.getenv("ES_HOST", "https://localhost:9200")
ES_USER     = os.getenv("ES_USER", "elastic")
ES_PASSWORD = os.getenv("ES_PASSWORD")

# Qdrant
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = os.getenv("QDRANT_PORT", "6333")

# Anthropic (RAG Chat)
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")