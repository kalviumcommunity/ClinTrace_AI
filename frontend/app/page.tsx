"use client";

import { FormEvent, useState } from "react";

type Source = {
  chunk_id: string | null;
  text: string;
  metadata: { source_document?: string; chunk_index?: number; [key: string]: unknown };
  score: number | null;
};

type QueryResponse = { answer: string; results: Source[] };

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const examples = [
  "How long are signed consent records retained?",
  "What happens after a patient gives consent?",
];

export default function Home() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function askQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || loading) return;
    setLoading(true);
    setError("");
    setResponse(null);
    try {
      const result = await fetch(`${API_URL}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmedQuestion, k: 4 }),
      });
      const payload = await result.json();
      if (!result.ok) throw new Error(payload.error || "The RAG API could not answer the question.");
      setResponse(payload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The RAG API is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="workspace-shell">
      <header className="topbar">
        <a className="brand" href="#top"><span className="brand-mark">C</span><span>ClinTrace <b>Ask</b></span></a>
        <div className="connection-status"><span className="status-dot" /> Live retrieval workspace</div>
      </header>

      <section className="intro" id="top">
        <div><p className="eyebrow">Grounded answers / runtime corpus</p><h1>Ask the <em>record.</em></h1><p className="intro-copy">Ask a question and inspect the exact passages the retrieval API used to answer it.</p></div>
        <div className="intro-index"><span>01</span><span>QUERY</span><span>→</span><span>04</span><span>SOURCES</span></div>
      </section>

      <section className="query-section" aria-labelledby="question-title">
        <div className="section-label"><span id="question-title">Your question</span><span>POST /api/query</span></div>
        <form onSubmit={askQuestion}>
          <label className="question-field"><span className="visually-hidden">Question for the RAG API</span><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What would you like to know?" rows={3} disabled={loading} /></label>
          <div className="query-actions"><div className="examples" aria-label="Example questions">{examples.map((example) => <button type="button" key={example} onClick={() => setQuestion(example)}>{example}</button>)}</div><button className="ask-button" type="submit" disabled={loading || !question.trim()}>{loading ? "Retrieving..." : "Ask question"}<span aria-hidden="true">↗</span></button></div>
        </form>
      </section>

      <section className="results-layout" aria-live="polite">
        <div className="answer-column">
          <div className="section-label"><span>Grounded answer</span><span>{response ? "READY" : "WAITING"}</span></div>
          {loading && <div className="state-panel loading-state"><span className="loader" /><div><strong>Searching the live corpus</strong><p>Embedding your question and ranking matching chunks.</p></div></div>}
          {error && <div className="state-panel error-state"><strong>Could not retrieve an answer</strong><p>{error}</p><button type="button" onClick={() => setError("")}>Dismiss</button></div>}
          {!loading && !error && !response && <div className="empty-answer"><span>↳</span><p>Your answer will appear here with its evidence trail.</p></div>}
          {!loading && !error && response && <article className="answer-card"><div className="answer-marker">A / 01</div><p>{response.answer}</p><footer><span>Generated from {response.results.length} retrieved {response.results.length === 1 ? "source" : "sources"}</span><span className="verified">● GROUNDED</span></footer></article>}
        </div>

        <aside className="sources-column" aria-labelledby="sources-title">
          <div className="section-label"><span id="sources-title">Retrieved sources</span><span>{response?.results.length || 0} MATCHES</span></div>
          {response?.results.map((source, index) => <article className="source-card" key={source.chunk_id || `${source.metadata.source_document}-${index}`}><div className="source-heading"><span className="source-number">0{index + 1}</span><span className="source-score">{source.score === null ? "—" : `${Math.round(source.score * 100)}% match`}</span></div><h3>{source.metadata.source_document || "Indexed document"}</h3><p className="chunk-id">{source.chunk_id || `chunk-${source.metadata.chunk_index ?? index}`}</p><p>{source.text}</p><div className="source-meta"><span>Chunk {source.metadata.chunk_index ?? index}</span><span>Evidence</span></div></article>)}
          {!response && <div className="sources-placeholder">Sources will be listed beside the answer after a query.</div>}
        </aside>
      </section>

      <footer className="page-footer"><span>CLINTRACE / RAG EXPLORER</span><span>Answers stay close to evidence.</span></footer>
    </main>
  );
}
