"""Split retrieval documents into token-sized chunks with controlled overlap."""

import json
from dataclasses import asdict, dataclass
from pathlib import Path

import tiktoken


ENCODING_NAME = "cl100k_base"
CHUNK_SIZE_TOKENS = 512
OVERLAP_TOKENS = 64


@dataclass(frozen=True)
class Chunk:
    index: int
    start_token: int
    end_token: int
    text: str


def chunk_text(
    text: str,
    chunk_size_tokens: int = CHUNK_SIZE_TOKENS,
    overlap_tokens: int = OVERLAP_TOKENS,
    encoding_name: str = ENCODING_NAME,
) -> list[Chunk]:
    """Create chunks whose encoded lengths never exceed the configured size."""
    if not isinstance(text, str):
        raise TypeError("text must be a string")
    if chunk_size_tokens <= 0:
        raise ValueError("chunk_size_tokens must be greater than zero")
    if overlap_tokens < 0 or overlap_tokens >= chunk_size_tokens:
        raise ValueError("overlap_tokens must be between zero and chunk size - 1")

    encoding = tiktoken.get_encoding(encoding_name)
    tokens = encoding.encode(text)
    step = chunk_size_tokens - overlap_tokens
    chunks = []

    for index, start in enumerate(range(0, len(tokens), step)):
        end = min(start + chunk_size_tokens, len(tokens))
        chunks.append(
            Chunk(
                index=index,
                start_token=start,
                end_token=end,
                text=encoding.decode(tokens[start:end]),
            )
        )
        if end == len(tokens):
            break

    return chunks


def boundary_demo(text: str, boundary: int) -> dict[str, object]:
    """Compare a boundary split with and without overlap for sample evidence."""
    without_overlap = chunk_text(text, boundary, 0)
    with_overlap = chunk_text(text, boundary, min(4, boundary - 1))
    return {
        "without_overlap": [asdict(chunk) for chunk in without_overlap],
        "with_overlap": [asdict(chunk) for chunk in with_overlap],
    }


def _sample_text() -> str:
    return (
        "The intake workflow validates the patient identity before retrieval. "
        "The most important boundary detail is that a missing consent form "
        "stops processing before any document is indexed. "
        "After validation, the approved record is normalized and embedded."
    )


def sample_results() -> dict[str, object]:
    sample = _sample_text()
    chunks = chunk_text(sample)
    demo = boundary_demo(sample, 16)
    return {
        "encoding": ENCODING_NAME,
        "settings": {
            "chunk_size_tokens": CHUNK_SIZE_TOKENS,
            "overlap_tokens": OVERLAP_TOKENS,
            "overlap_ratio": OVERLAP_TOKENS / CHUNK_SIZE_TOKENS,
        },
        "sample_token_count": len(tiktoken.get_encoding(ENCODING_NAME).encode(sample)),
        "chunk_count": len(chunks),
        "chunks": [asdict(chunk) for chunk in chunks],
        "boundary_demo": demo,
    }


def write_sample_output(path: Path) -> None:
    path.write_text(json.dumps(sample_results(), indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    output_path = Path(__file__).with_name("token-chunking-sample-output.json")
    write_sample_output(output_path)
    print(f"Wrote {output_path}")