import unittest

from scripts.token_chunker import chunk_text


class TokenChunkerTests(unittest.TestCase):
    def test_chunks_are_sized_by_tokens_and_overlap_adjacent_ranges(self):
        text = "one two three four five six seven eight nine ten " * 20
        chunks = chunk_text(text, chunk_size_tokens=12, overlap_tokens=3)

        self.assertGreater(len(chunks), 1)
        for chunk in chunks:
            self.assertLessEqual(chunk.end_token - chunk.start_token, 12)
        self.assertEqual(chunks[0].end_token - chunks[1].start_token, 3)

    def test_zero_overlap_has_no_shared_token_range(self):
        chunks = chunk_text("alpha beta gamma delta " * 10, 8, 0)

        self.assertEqual(chunks[0].end_token, chunks[1].start_token)

    def test_rejects_invalid_overlap(self):
        with self.assertRaises(ValueError):
            chunk_text("text", 10, 10)


if __name__ == "__main__":
    unittest.main()