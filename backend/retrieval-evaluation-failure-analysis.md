# Retrieval Evaluation Failure Analysis

The labelled set contains three clear single-topic queries and one deliberately
ambiguous query: `mixed-consent-billing-query`. The vector-only ranking places
`billing-policy.md#0` first even though the expected chunk is
`intake-policy.md#0`. Its embedding lies between the intake and billing vectors,
so semantic similarity alone is not enough for this wording.

The lexical reranker recovers the expected intake chunk at rank 1 because the
query contains the distinctive term `consent`. This improves recall@1 from 0.75
to 1.0 on this tiny fixture. The result is encouraging but not a production
quality claim: the corpus has only three chunks and the labels are synthetic.

Likely improvements for a real corpus are richer labelled queries, query
decomposition for multi-topic questions, better chunk boundaries, metadata
filters where the user names a domain, and an embedding-model consistency check.
The checked-in JSON report records both vector-only and reranked metrics plus the
failed baseline case.