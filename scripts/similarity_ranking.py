"""
Embedding Similarity & Distance Metrics
Kalvium Assignment 3.27

This program:
1. Computes cosine similarity.
2. Compares one query with several chunks.
3. Ranks chunks by similarity score.
4. Shows the most and least similar chunks.
5. Explains why cosine similarity is useful.
"""


import math


# ---------------------------------------------------------
# 1. COSINE SIMILARITY
# ---------------------------------------------------------

def dot_product(a, b):
    """Calculate the dot product of two vectors."""
    return sum(x * y for x, y in zip(a, b))


def vector_norm(vector):
    """Calculate the length of a vector."""
    return math.sqrt(sum(x * x for x in vector))


def cosine_similarity(a, b):
    """
    Calculate cosine similarity between two vectors.

    Higher score = more similar.
    """

    denominator = vector_norm(a) * vector_norm(b)

    if denominator == 0:
        return 0.0

    return dot_product(a, b) / denominator


# ---------------------------------------------------------
# 2. QUERY EMBEDDING
# ---------------------------------------------------------

query = "How can a learner reset their password?"

# Sample embedding for the query.
# In a real RAG system, this would come from an
# embedding model or API.

query_embedding = [0.90, 0.80, 0.70, 0.85, 0.75]


# ---------------------------------------------------------
# 3. CHUNK EMBEDDINGS
# ---------------------------------------------------------

chunk_records = [

    {
        "text": "Password reset instructions for learner accounts.",
        "metadata": {
            "source": "account-guide.md",
            "chunk_index": 0
        },
        "embedding": [0.88, 0.82, 0.72, 0.86, 0.74]
    },

    {
        "text": "The cafeteria menu changes every Friday.",
        "metadata": {
            "source": "campus-guide.md",
            "chunk_index": 3
        },
        "embedding": [0.10, 0.20, 0.05, 0.15, 0.10]
    },

    {
        "text": "Learners can recover access using their registered email.",
        "metadata": {
            "source": "account-guide.md",
            "chunk_index": 1
        },
        "embedding": [0.84, 0.78, 0.68, 0.80, 0.70]
    },

    {
        "text": "The library is open from 9 AM to 6 PM.",
        "metadata": {
            "source": "campus-guide.md",
            "chunk_index": 5
        },
        "embedding": [0.15, 0.10, 0.20, 0.08, 0.12]
    },

    {
        "text": "If you cannot log in, contact the account support team.",
        "metadata": {
            "source": "support-guide.md",
            "chunk_index": 2
        },
        "embedding": [0.80, 0.75, 0.65, 0.78, 0.68]
    }
]


# ---------------------------------------------------------
# 4. CALCULATE SIMILARITY
# ---------------------------------------------------------

ranked = []

for record in chunk_records:

    score = cosine_similarity(
        query_embedding,
        record["embedding"]
    )

    ranked.append({
        **record,
        "score": score
    })


# ---------------------------------------------------------
# 5. SORT RESULTS
# ---------------------------------------------------------

ranked = sorted(
    ranked,
    key=lambda item: item["score"],
    reverse=True
)


# ---------------------------------------------------------
# 6. DISPLAY QUERY
# ---------------------------------------------------------

print("=" * 70)
print("EMBEDDING SIMILARITY & DISTANCE METRICS")
print("=" * 70)

print("\nQuery:")
print(query)

print("\nMetric:")
print("Cosine Similarity")


# ---------------------------------------------------------
# 7. DISPLAY RANKED RESULTS
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("RANKED RESULTS")
print("=" * 70)

for rank, item in enumerate(ranked, start=1):

    print(f"\nRank {rank}")
    print(f"Score: {item['score']:.4f}")
    print(f"Text: {item['text']}")
    print(f"Source: {item['metadata']['source']}")
    print(f"Chunk Index: {item['metadata']['chunk_index']}")


# ---------------------------------------------------------
# 8. MOST SIMILAR
# ---------------------------------------------------------

most_similar = ranked[0]

print("\n" + "=" * 70)
print("MOST SIMILAR CHUNK")
print("=" * 70)

print(f"Score: {most_similar['score']:.4f}")
print(f"Text: {most_similar['text']}")
print(f"Source: {most_similar['metadata']['source']}")
print(f"Chunk Index: {most_similar['metadata']['chunk_index']}")


# ---------------------------------------------------------
# 9. LEAST SIMILAR
# ---------------------------------------------------------

least_similar = ranked[-1]

print("\n" + "=" * 70)
print("LEAST SIMILAR CHUNK")
print("=" * 70)

print(f"Score: {least_similar['score']:.4f}")
print(f"Text: {least_similar['text']}")
print(f"Source: {least_similar['metadata']['source']}")
print(f"Chunk Index: {least_similar['metadata']['chunk_index']}")


# ---------------------------------------------------------
# 10. METRIC JUSTIFICATION
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("WHY COSINE SIMILARITY?")
print("=" * 70)

print("""
Cosine similarity compares the direction of two embedding vectors.

It is useful for comparing text embeddings because embeddings
represent semantic meaning.

A higher cosine similarity score means the query and chunk are
more similar in embedding space.

Similarity:
    Higher score = more similar

Distance:
    Lower distance = closer
""")


# ---------------------------------------------------------
# 11. IMPORTANT LIMITATION
# ---------------------------------------------------------

print("=" * 70)
print("IMPORTANT LIMITATION")
print("=" * 70)

print("""
A high similarity score means that a chunk is semantically
relevant to the query.

However, a high similarity score does NOT guarantee that
the information is:

- Factually correct
- Up to date
- Complete
- Safe to use by itself

Similarity ranking finds likely relevant context.
The rest of the RAG system still needs validation,
metadata, citations, and freshness checks when appropriate.
""")