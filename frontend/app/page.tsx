"use client";

import { useMemo, useState } from "react";

type Supplement = {
  brand: string;
  name: string;
  category: string;
  format: string;
  color: string;
  badge?: string;
  note: string;
  image: string;
  protein: string;
  serving: string;
  ingredients: string;
  dietary: string;
};

const supplements: Supplement[] = [
  { brand: "MuscleBlaze", name: "Biozyme Whey", category: "Protein", format: "Whey protein", color: "coral", badge: "Popular", note: "A whey protein product for increasing daily protein intake. Verify nutrition and allergen details on the current label.", image: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=900&q=85", protein: "25 g", serving: "1 scoop / 33 g", ingredients: "Whey protein concentrate, whey protein isolate", dietary: "Contains milk" },
  { brand: "Avvatar", name: "Whey Protein", category: "Protein", format: "Whey protein", color: "mint", note: "Protein supplement information varies by flavor and pack size. Use the manufacturer label as the source of truth.", image: "https://images.unsplash.com/photo-1622484212850-eb596d769edc?auto=format&fit=crop&w=900&q=85", protein: "24 g", serving: "1 scoop / label varies", ingredients: "Whey protein concentrate and flavoring", dietary: "Contains milk" },
  { brand: "MuscleTech", name: "Performance Series", category: "Performance", format: "Sports nutrition", color: "blue", badge: "Performance", note: "A performance nutrition range that may include protein, creatine, and pre-workout products.", image: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=900&q=85", protein: "Label varies", serving: "Follow package label", ingredients: "Performance blend; verify exact formula", dietary: "Check current label" },
  { brand: "Hyuga Life", name: "Daily Wellness", category: "Wellness", format: "Vitamins & minerals", color: "violet", note: "Wellness products such as vitamins, minerals, omega-3, and probiotics. Check the exact formulation before use.", image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=900&q=85", protein: "Not applicable", serving: "Label dependent", ingredients: "Vitamins, minerals, or wellness blend", dietary: "Check allergens" },
  { brand: "RSP Nutrition", name: "Active Fuel", category: "Performance", format: "Sports nutrition", color: "amber", note: "Sports nutrition range covering protein, creatine, pre-workout, and amino acid products.", image: "https://images.unsplash.com/photo-1579722821273-0f6c1d44362f?auto=format&fit=crop&w=900&q=85", protein: "Label varies", serving: "Follow package label", ingredients: "Sports nutrition blend", dietary: "Check current label" },
  { brand: "Optimum Nutrition", name: "Gold Standard", category: "Protein", format: "Whey & casein", color: "slate", note: "Protein products including whey and casein. Product claims and ingredients must be checked against the package.", image: "https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?auto=format&fit=crop&w=900&q=85", protein: "24 g", serving: "1 scoop / label varies", ingredients: "Whey protein isolate and concentrate", dietary: "Contains milk" },
  { brand: "GNC", name: "Foundational Health", category: "Wellness", format: "Daily nutrition", color: "rose", note: "A broad wellness catalog including vitamins, minerals, protein, and herbal products.", image: "https://images.unsplash.com/photo-1550572017-edd951b55104?auto=format&fit=crop&w=900&q=85", protein: "Not applicable", serving: "Label dependent", ingredients: "Vitamin and mineral blend", dietary: "Check current label" },
  { brand: "Fast&Up", name: "Hydration Mix", category: "Hydration", format: "Electrolytes", color: "lime", note: "Hydration and electrolyte products. Serving guidance depends on the current product label.", image: "https://images.unsplash.com/photo-1559839914-17aae19cec71?auto=format&fit=crop&w=900&q=85", protein: "Not applicable", serving: "Label dependent", ingredients: "Electrolytes and flavoring", dietary: "Check current label" },
];

const categories = ["All", "Protein", "Performance", "Wellness", "Hydration"];

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(supplements[0]);

  const filteredSupplements = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();
    return supplements.filter((supplement) => {
      const matchesCategory = activeCategory === "All" || supplement.category === activeCategory;
      const matchesQuery = !normalizedQuery || `${supplement.brand} ${supplement.name} ${supplement.format}`.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query]);

  return (
    <main className="app-shell">
      <nav className="topbar">
        <a className="brand-lockup" href="#top" aria-label="ClinTrace home"><span className="brand-mark">C</span><span>ClinTrace <b>Intake</b></span></a>
        <div className="topbar-meta"><span className="status-dot" /><span>Evidence-led catalog</span><span className="divider" /><span>September 2026</span></div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy"><p className="eyebrow">Health supplement intelligence</p><h1>Know what&apos;s in the <em>stack.</em></h1><p className="hero-text">A grounded intake view for comparing products, brands, and supplement categories without guessing beyond the label.</p><div className="hero-pills"><span><strong>{supplements.length}</strong> tracked examples</span><span><strong>08</strong> catalog records</span></div></div>
        <div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="hero-bottle"><span>CLINTRACE</span><strong>WHEY</strong><small>LABEL-FIRST</small></div><div className="hero-caption">01 / DISCOVER</div></div>
      </section>

      <section className="catalog-section" aria-labelledby="catalog-title">
        <div className="section-heading"><div><p className="eyebrow">Curated intake</p><h2 id="catalog-title">Explore the catalog</h2></div><label className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search brands or products" aria-label="Search brands or products" /></label></div>
        <div className="catalog-toolbar"><div className="filters" role="tablist" aria-label="Supplement categories">{categories.map((category) => <button className={activeCategory === category ? "filter active" : "filter"} key={category} onClick={() => setActiveCategory(category)} role="tab" aria-selected={activeCategory === category}>{category}</button>)}</div><span className="result-count">{filteredSupplements.length} results</span></div>
        <div className="catalog-layout">
          <div className="product-grid">{filteredSupplements.map((supplement) => <button className={`product-card ${selected.name === supplement.name ? "selected" : ""}`} key={`${supplement.brand}-${supplement.name}`} onClick={() => setSelected(supplement)}><div className={`product-visual ${supplement.color}`}><img src={supplement.image} alt="" /><span className="product-brand">{supplement.brand}</span><div className="product-pack"><strong>{supplement.name.split(" ")[0]}</strong><small>{supplement.category.toUpperCase()}</small></div>{supplement.badge && <span className="product-badge">{supplement.badge}</span>}</div><div className="product-info"><span>{supplement.format}</span><h3>{supplement.name}</h3><p>{supplement.brand}</p></div></button>)}</div>
          <aside className="detail-panel"><div className="detail-topline"><span>Selected profile</span><span className="record-dot">●</span></div><div className="detail-image"><img src={selected.image} alt={`${selected.brand} ${selected.name}`} /></div><p className="detail-category">{selected.category} / {selected.format}</p><h2>{selected.brand}<br /><em>{selected.name}</em></h2><p className="detail-note">{selected.note}</p><div className="profile-grid"><div><span>Protein</span><strong>{selected.protein}</strong></div><div><span>Serving</span><strong>{selected.serving}</strong></div><div><span>Ingredients</span><strong>{selected.ingredients}</strong></div><div><span>Dietary</span><strong>{selected.dietary}</strong></div></div><div className="detail-rule" /><div className="detail-footer"><span>Source status</span><strong>Label required</strong></div><p className="safety-note">Catalog records support discovery only. They do not diagnose, treat, or replace qualified healthcare advice.</p></aside>
        </div>
      </section>
      <footer><span>CLINTRACE / SUPPLEMENT INTAKE</span><span>Source-aware by design</span></footer>
    </main>
  );
}
