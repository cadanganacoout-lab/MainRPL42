import React, { useEffect, useRef, useState } from "react";
import { DashboardSidebar } from "../components/DashboardSidebar.jsx";
import { StudentCard } from "../components/StudentCard.jsx";
import { MediaUploader } from "../components/MediaUploader.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { apiRequest } from "../lib/api.js";

const FACT_LIMIT = 5;
const FACT_LABEL_LIMIT = 40;
const FACT_VALUE_LIMIT = 300;
const PORTFOLIO_LIMIT = 2048;

function editableValues(card) {
  return {
    facts: Array.from({ length: FACT_LIMIT }, (_, index) => ({
      label: card.facts?.[index]?.label || "",
      value: card.facts?.[index]?.value || "",
    })),
    portfolio: card.portfolio || "",
  };
}

function hasChanges(original, draft) {
  if (!original || !draft) return false;
  const originalDraft = editableValues(original);
  return draft.portfolio.trim() !== originalDraft.portfolio.trim() ||
    draft.facts.some((fact, index) =>
      fact.label.trim() !== originalDraft.facts[index].label.trim() ||
      fact.value.trim() !== originalDraft.facts[index].value.trim(),
    );
}

function CardEditorLoading() {
  return (
    <div className="card-editor-loading" aria-busy="true">
      <span className="student-skeleton student-skeleton--name" />
      <span className="student-skeleton" />
      <span className="student-skeleton" />
      <span className="student-skeleton student-skeleton--button" />
      <span className="visually-hidden" role="status">Memuat card milik Anda…</span>
    </div>
  );
}

export function CardEditorPage() {
  const { user } = useAuth();
  const [card, setCard] = useState(null);
  const [draft, setDraft] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const previousHash = useRef(window.location.hash);
  const restoringHash = useRef(false);
  const allowedHash = useRef(null);
  const dirty = hasChanges(card, draft);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    setError("");

    apiRequest("/api/cards/me")
      .then(payload => {
        if (!payload.card || typeof payload.card !== "object") {
          throw new Error("Respons card tidak valid.");
        }
        if (active) {
          setCard(payload.card);
          setDraft(editableValues(payload.card));
          setStatus("ready");
        }
      })
      .catch(requestError => {
        if (active) {
          setError(requestError.message);
          setStatus("error");
        }
      });

    return () => {
      active = false;
    };
  }, [retry]);

  useEffect(() => {
    if (!dirty) return undefined;
    const warnBeforeUnload = event => {
      event.preventDefault();
      event.returnValue = "";
    };
    const confirmHashNavigation = () => {
      if (restoringHash.current) {
        restoringHash.current = false;
        return;
      }
      const nextHash = window.location.hash;
      if (allowedHash.current === nextHash) {
        allowedHash.current = null;
        previousHash.current = nextHash;
        return;
      }
      if (window.confirm("Perubahan belum disimpan. Tetap tinggalkan halaman?")) {
        previousHash.current = nextHash;
      } else {
        restoringHash.current = true;
        window.location.hash = previousHash.current;
      }
    };
    const confirmAnchorNavigation = event => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest('a[href^="#/"]');
      if (!link || link.hash === window.location.hash) return;
      if (!window.confirm("Perubahan belum disimpan. Tetap tinggalkan halaman?")) {
        event.preventDefault();
        return;
      }
      previousHash.current = link.hash;
      allowedHash.current = link.hash;
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    window.addEventListener("hashchange", confirmHashNavigation, true);
    document.addEventListener("click", confirmAnchorNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      window.removeEventListener("hashchange", confirmHashNavigation, true);
      document.removeEventListener("click", confirmAnchorNavigation, true);
    };
  }, [dirty]);

  useEffect(() => {
    if (!dirty) previousHash.current = window.location.hash;
  }, [dirty]);

  async function save(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const partialFact = draft.facts.some(fact =>
        Boolean(fact.label.trim()) !== Boolean(fact.value.trim()),
      );
      if (partialFact) {
        setError("Isi label dan fakta pada setiap slot yang digunakan.");
        return;
      }
      const payload = await apiRequest("/api/cards/me", {
        method: "PATCH",
        body: {
          facts: draft.facts
            .filter(fact => fact.label.trim() && fact.value.trim())
            .map(fact => ({
              label: fact.label.trim(),
              value: fact.value.trim(),
            })),
          portfolio: draft.portfolio.trim(),
        },
      });
      setCard(payload.card);
      setDraft(editableValues(payload.card));
      setNotice("Perubahan card berhasil disimpan.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  function updateFact(index, field, value) {
    setDraft(current => ({
      ...current,
      facts: current.facts.map((fact, factIndex) =>
        factIndex === index ? { ...fact, [field]: value } : fact,
      ),
    }));
    setNotice("");
  }

  function updatePortfolio(value) {
    setDraft(current => ({ ...current, portfolio: value }));
    setNotice("");
  }

  return (
    <section className="dashboard-page dashboard-page--user dashboard-page--card-editor">
      <DashboardSidebar user={user} active="card" />
      <div className="dashboard-main">
        <section className="container page-hero">
          <span className="route-label">/card-saya</span>
          <h1>Edit card saya</h1>
          <p>Perbarui informasi card yang ditautkan ke akun Anda.</p>
        </section>
        <section className="container card-editor-page">
        {status === "loading" && <CardEditorLoading />}
        {status === "error" && (
          <div className="student-list-message" role="alert">
            <p>{error}</p>
            <button type="button" className="button-secondary" onClick={() => setRetry(value => value + 1)}>
              Coba muat ulang
            </button>
          </div>
        )}
        {status === "ready" && card && draft && (
          <div className="card-editor-layout">
            <form className="card-editor-form" onSubmit={save} aria-busy={saving}>
              <div className="card-editor-identity">
                <h2>{card.nama}</h2>
                <p>{card.jabatan} · Informasi identitas hanya dapat diubah admin.</p>
              </div>

              <fieldset className="card-facts-fields" aria-describedby="card-facts-help">
                <legend>Fakta tentang saya (maksimal 5)</legend>
                <p id="card-facts-help">Isi label dan fakta pada slot yang ingin ditampilkan di card.</p>
                {draft.facts.map((fact, index) => (
                  <div className="card-fact-editor" key={index}>
                    <span className="card-fact-number">Fakta {index + 1}</span>
                    <label htmlFor={`card-fact-label-${index}`}>Label</label>
                    <input
                      id={`card-fact-label-${index}`}
                      name={`facts[${index}][label]`}
                      value={fact.label}
                      maxLength={FACT_LABEL_LIMIT}
                      onChange={event => updateFact(index, "label", event.target.value)}
                    />
                    <label htmlFor={`card-fact-value-${index}`}>Isi fakta</label>
                    <input
                      id={`card-fact-value-${index}`}
                      name={`facts[${index}][value]`}
                      value={fact.value}
                      maxLength={FACT_VALUE_LIMIT}
                      onChange={event => updateFact(index, "value", event.target.value)}
                    />
                  </div>
                ))}
              </fieldset>

              <div className="auth-field">
                <label htmlFor="card-portfolio">Portfolio (opsional)</label>
                <input
                  id="card-portfolio"
                  name="portfolio"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  pattern="https://.+"
                  maxLength={PORTFOLIO_LIMIT}
                  value={draft.portfolio}
                  aria-describedby="card-portfolio-help card-portfolio-count"
                  onChange={event => updatePortfolio(event.target.value)}
                />
                <small id="card-portfolio-help">Gunakan URL HTTPS. Kosongkan untuk menghapus tautan.</small>
                <small id="card-portfolio-count">{draft.portfolio.length}/{PORTFOLIO_LIMIT} karakter</small>
              </div>

              <MediaUploader
                targetType="students"
                targetId={card.id}
                mediaType="avatar"
                currentUrl={card.avatar?.url || card.foto}
                removable={Boolean(card.avatar)}
                onChanged={media => setCard(current => ({ ...current, avatar: media }))}
              />
              <MediaUploader
                targetType="students"
                targetId={card.id}
                mediaType="background"
                currentUrl={card.background?.url || ""}
                removable={Boolean(card.background)}
                onChanged={media => setCard(current => ({ ...current, background: media }))}
              />

              {error && (
                <p className="auth-error" role="alert" aria-live="assertive">
                  {error}
                </p>
              )}
              {notice && <p className="card-editor-notice" role="status">{notice}</p>}

              <div className="card-editor-actions">
                <button className="auth-submit" type="submit" disabled={!dirty || saving}>
                  {saving ? "Menyimpan…" : "Simpan perubahan"}
                </button>
              </div>
              {dirty && <p className="card-editor-unsaved" role="status">Ada perubahan yang belum disimpan.</p>}
            </form>

            <aside className="card-editor-preview" aria-labelledby="card-preview-heading">
              <h2 id="card-preview-heading">Pratinjau</h2>
              <StudentCard student={{ ...card, ...draft }} />
            </aside>
          </div>
        )}
        </section>
      </div>
    </section>
  );
}
