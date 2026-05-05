import os
import re
import hashlib
import httpx

from pathlib import Path
from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    VectorParams,
    Distance,
    PointStruct,
    TextIndexParams,
    TokenizerType,
)


DOCS_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

COLLECTION_NAME = "docfx-docs"
QDRANT_URL = "http://localhost:6333"
OLLAMA_URL = "http://127.0.0.1:11434"
EMBED_MODEL = "nomic-embed-text"
EMBED_DIM = 768


def stable_point_id(source: str, chunk_index: int) -> int:
    raw = f"{source}:{chunk_index}".encode("utf-8")
    digest = hashlib.sha256(raw).hexdigest()
    return int(digest[:16], 16)


def clean_heading(text: str) -> str:
    return text.strip().strip("#").strip()


def chunk_by_headers(markdown_text: str, source_file: str):
    chunks = []

    current_lines = []
    current_header = "Introduction"
    current_level = 0
    heading_stack = []

    def flush_chunk():
        nonlocal current_lines, current_header, current_level

        text = "\n".join(current_lines).strip()
        if not text:
            return

        parent_headers = [h["title"] for h in heading_stack[:-1]]
        section_path = " > ".join([h["title"] for h in heading_stack]) or current_header

        path = Path(source_file)
        if path.parts and path.parts[0] == "docfx-site":
            qdrant_source_file = str(Path(*path.parts[1:])).replace("\\", "/")

        chunks.append({
            "text": text,
            "header": current_header,
            "level": current_level,
            "source": qdrant_source_file,
            "parent_headers": parent_headers,
            "section_path": section_path,
        })

    for line in markdown_text.splitlines():
        header_match = re.match(r"^(#{1,6})\s+(.+?)\s*$", line)

        if header_match:
            flush_chunk()

            level = len(header_match.group(1))
            header = clean_heading(header_match.group(2))

            while heading_stack and heading_stack[-1]["level"] >= level:
                heading_stack.pop()

            heading_stack.append({
                "level": level,
                "title": header,
            })

            current_header = header
            current_level = level
            current_lines = [line]
        else:
            current_lines.append(line)

    flush_chunk()

    return chunks


def get_embedding(text: str):
    response = httpx.post(
        f"{OLLAMA_URL}/api/embed",
        json={
            "model": EMBED_MODEL,
            "input": text,
        },
        timeout=300.0,
    )
    response.raise_for_status()
    return response.json()["embeddings"][0]


def find_markdown_files(root_dir: str):
    md_files = []

    ignored_dirs = {
        "_site",
        "qdrant_storage",
        "__pycache__",
        "node_modules",
        ".git",
        ".next",
        "dist",
        "build",
    }

    for root, dirs, files in os.walk(root_dir):
        dirs[:] = [
            d for d in dirs
            if d not in ignored_dirs
        ]

        for file in files:
            if file.endswith(".md"):
                md_files.append(os.path.join(root, file))

    return md_files


def embedding_text_for_chunk(chunk: dict) -> str:
    parent_headers = " > ".join(chunk["parent_headers"])

    return f"""
Source: {chunk["source"]}
Section path: {chunk["section_path"]}
Parent sections: {parent_headers}
Current section: {chunk["header"]}

{chunk["text"]}
""".strip()


def generate_anchor(header: str) -> str:
    """Generate a docfx-compatible anchor from a header string."""
    # Convert to lowercase
    anchor = header.lower()
    # Remove special characters (keep only alphanumeric and spaces)
    anchor = re.sub(r'[^a-z0-9\s]', '', anchor)
    # Replace spaces with hyphens
    anchor = re.sub(r'\s+', '-', anchor)
    # Remove multiple consecutive hyphens
    anchor = re.sub(r'-+', '-', anchor)
    # Strip leading/trailing hyphens
    anchor = anchor.strip('-')
    return anchor


def doc_url_from_source(source: str, header: str = "") -> str:
    """Convert a markdown source path to a docfx documentation URL with anchor."""
    base_url = "http://localhost:8080"

    # Docfx treats README.md as index.html
    if source == "README.md":
        html_path = "index.html"
    else:
        html_path = source.replace(".md", ".html")

    url = f"{base_url}/{html_path}"

    if header:
        anchor = generate_anchor(header)
        if anchor:
            url += f"#{anchor}"

    return url


def payload_for_chunk(chunk: dict, chunk_index: int) -> dict:
    return {
        "text": chunk["text"],
        "header": chunk["header"],
        "source": chunk["source"],
        "doc_url": doc_url_from_source(chunk["source"], chunk["header"]),
        "level": chunk["level"],
        "parent_headers": chunk["parent_headers"],
        "section_path": chunk["section_path"],
        "chunk_index": chunk_index,
    }


def recreate_collection(client: QdrantClient):
    # Delete entire collection if it exists for a fresh start
    if client.collection_exists(COLLECTION_NAME):
        print(f"Deleting existing collection '{COLLECTION_NAME}'...")
        client.delete_collection(COLLECTION_NAME)
        print(f"Collection '{COLLECTION_NAME}' deleted.")

    print(f"Creating new collection '{COLLECTION_NAME}'...")
    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(
            size=EMBED_DIM,
            distance=Distance.COSINE,
        ),
    )

    print("Creating payload indexes...")
    client.create_payload_index(
        collection_name=COLLECTION_NAME,
        field_name="text",
        field_schema=TextIndexParams(
            type="text",
            tokenizer=TokenizerType.WORD,
            min_token_len=2,
            max_token_len=20,
            lowercase=True,
        ),
    )

    client.create_payload_index(
        collection_name=COLLECTION_NAME,
        field_name="header",
        field_schema=TextIndexParams(
            type="text",
            tokenizer=TokenizerType.WORD,
            min_token_len=2,
            max_token_len=20,
            lowercase=True,
        ),
    )

    client.create_payload_index(
        collection_name=COLLECTION_NAME,
        field_name="section_path",
        field_schema=TextIndexParams(
            type="text",
            tokenizer=TokenizerType.WORD,
            min_token_len=2,
            max_token_len=30,
            lowercase=True,
        ),
    )
    print("Payload indexes created.")


def main():
    client = QdrantClient(url=QDRANT_URL)

    recreate_collection(client)

    md_files = find_markdown_files(DOCS_DIR)
    print(f"Found {len(md_files)} markdown files")

    points = []

    for md_file in md_files:
        rel_path = os.path.relpath(md_file, DOCS_DIR)
        print(f"Processing: {rel_path}")

        with open(md_file, "r", encoding="utf-8") as f:
            content = f.read()

        chunks = chunk_by_headers(content, rel_path)

        for chunk_index, chunk in enumerate(chunks):
            try:
                text_to_embed = embedding_text_for_chunk(chunk)
                embedding = get_embedding(text_to_embed)

                point_id = stable_point_id(rel_path, chunk_index)

                points.append(
                    PointStruct(
                        id=point_id,
                        vector=embedding,
                        payload=payload_for_chunk(chunk, chunk_index),
                    )
                )

                print(
                    f"  Indexed chunk {chunk_index}: "
                    f"{chunk['section_path']}"
                )

            except Exception as e:
                print(f"Error embedding chunk in {rel_path}: {e}")

    if points:
        client.upsert(
            collection_name=COLLECTION_NAME,
            points=points,
        )
        print(f"Indexed {len(points)} chunks into Qdrant")

    print("Done!")


if __name__ == "__main__":
    main()