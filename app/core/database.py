import pyodbc
from app.core.config import (
    SQLSERVER_HOST, SQLSERVER_PORT,
    SQLSERVER_USER, SQLSERVER_PASSWORD,
    SQLSERVER_DB, SQLSERVER_DRIVER
)

def get_connection():
    conn_str = (
        f"DRIVER={{{SQLSERVER_DRIVER}}};"
        f"SERVER={SQLSERVER_HOST},{SQLSERVER_PORT};"
        f"DATABASE={SQLSERVER_DB};"
        f"UID={SQLSERVER_USER};"
        f"PWD={SQLSERVER_PASSWORD};"
        f"TrustServerCertificate=yes;"
    )
    return pyodbc.connect(conn_str)

def execute_query(query: str, params=None, fetch=False):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(query, params or [])
        if fetch:
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()
            conn.commit()
            return [dict(zip(columns, row)) for row in rows]
        else:
            conn.commit()
    finally:
        conn.close()