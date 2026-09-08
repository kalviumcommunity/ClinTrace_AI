"""Load supported document formats into text while preserving provenance."""

import argparse
import json
from dataclasses import asdict, dataclass
from pathlib import Path

from bs4 import BeautifulSoup
from pypdf import PdfReader


SUPPORTED_SUFFIXES = {".pdf", ".txt", ".md", ".html", ".htm"}


@dataclass(frozen=True)
class LoadedDocument:
    source: str
    source_path: str
    format: str
    text: str


@dataclass(frozen=True)
class SkippedDocument:
    source: str
    source_path: str
    reason: str


def load_text(path: Path) -> str:
    """Extract a document into one plain-text string."""
    path = Path(path)
    suffix = path.suffix.lower()

    if suffix == ".pdf":
        reader = PdfReader(str(path))
        return "\n".join(page.extract_text() or "" for page in reader.pages)

    if suffix in {".txt", ".md"}:
        return path.read_text(encoding="utf-8", errors="ignore")

    if suffix in {".html", ".htm"}:
        markup = path.read_text(encoding="utf-8", errors="ignore")
        return BeautifulSoup(markup, "html.parser").get_text(" ", strip=True)

    raise ValueError(f"unsupported file type: {suffix or '<none>'}")


def load_document(path: Path) -> LoadedDocument:
    """Load one file and retain its filename, path, and format."""
    path = Path(path)
    suffix = path.suffix.lower()
    if suffix not in SUPPORTED_SUFFIXES:
        raise ValueError(f"unsupported file type: {suffix or '<none>'}")

    return LoadedDocument(
        source=path.name,
        source_path=str(path),
        format=suffix[1:],
        text=load_text(path),
    )


def load_directory(root: Path) -> dict[str, list[dict[str, object]]]:
    """Load supported files recursively and skip failures without aborting."""
    root = Path(root)
    documents = []
    skipped = []

    for path in sorted(path for path in root.rglob("*") if path.is_file()):
        try:
            documents.append(asdict(load_document(path)))
        except Exception as error:
            skipped.append(
                asdict(
                    SkippedDocument(
                        source=path.name,
                        source_path=str(path),
                        reason=str(error),
                    )
                )
            )

    return {"documents": documents, "skipped": skipped}


def inspection_report(result: dict[str, list[dict[str, object]]]) -> dict[str, object]:
    """Summarize intake so operators can confirm length and sample text."""
    return {
        "loaded_count": len(result["documents"]),
        "skipped_count": len(result["skipped"]),
        "documents": [
            {
                "source": document["source"],
                "format": document["format"],
                "char_count": len(document["text"]),
                "sample": document["text"][:80],
            }
            for document in result["documents"]
        ],
        "skipped": result["skipped"],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path, help="directory to load recursively")
    parser.add_argument(
        "--output",
        type=Path,
        help="optional JSON path for the inspection report",
    )
    args = parser.parse_args()

    report = inspection_report(load_directory(args.directory))
    serialized = json.dumps(report, indent=2) + "\n"
    if args.output:
        args.output.write_text(serialized, encoding="utf-8")
        print(f"Wrote {args.output}")
    else:
        print(serialized, end="")


if __name__ == "__main__":
    main()