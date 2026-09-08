import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts.document_loader import (
    inspection_report,
    load_directory,
    load_document,
    load_text,
)


class FakePage:
    def __init__(self, text):
        self.text = text

    def extract_text(self):
        return self.text


class FakePdfReader:
    def __init__(self, _path):
        self.pages = [FakePage("PDF protocol page one"), FakePage(None)]


class DocumentLoaderTests(unittest.TestCase):
    def test_loads_text_markdown_and_html_as_plain_text(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "notes.txt").write_text("Plain text", encoding="utf-8")
            (root / "guide.md").write_text("# Heading\n\nMarkdown body", encoding="utf-8")
            (root / "export.html").write_text(
                "<html><body><h1>Title</h1><p>HTML body</p></body></html>",
                encoding="utf-8",
            )

            self.assertEqual(load_text(root / "notes.txt"), "Plain text")
            self.assertIn("# Heading", load_text(root / "guide.md"))
            self.assertEqual(load_text(root / "export.html"), "Title HTML body")

    @patch("scripts.document_loader.PdfReader", FakePdfReader)
    def test_loads_pdf_pages_and_preserves_source_identity(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "protocol.pdf"
            path.write_bytes(b"not parsed by the fake reader")

            document = load_document(path)

            self.assertEqual(document.source, "protocol.pdf")
            self.assertEqual(document.format, "pdf")
            self.assertEqual(document.text, "PDF protocol page one\n")

    def test_skips_corrupt_and_unsupported_files_without_aborting(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "good.txt").write_text("Loaded", encoding="utf-8")
            (root / "unsupported.csv").write_text("a,b", encoding="utf-8")
            (root / "broken.pdf").write_bytes(b"not a PDF")

            result = load_directory(root)
            report = inspection_report(result)

            self.assertEqual(report["loaded_count"], 1)
            self.assertEqual(report["documents"][0]["source"], "good.txt")
            self.assertEqual(report["documents"][0]["char_count"], 6)
            self.assertEqual(report["skipped_count"], 2)
            self.assertTrue(any("unsupported" in item["reason"] for item in report["skipped"]))
            self.assertTrue(any(item["source"] == "broken.pdf" for item in report["skipped"]))


if __name__ == "__main__":
    unittest.main()