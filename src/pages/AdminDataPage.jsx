import React, { useEffect, useMemo, useState } from "react";
import { DashboardSidebar } from "../components/DashboardSidebar.jsx";
import { MediaUploader } from "../components/MediaUploader.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { apiRequest } from "../lib/api.js";

const EMPTY_STUDENT = {
  nama: "",
  jabatan: "Siswa",
  facts: [],
  foto: "",
  portfolio: "",
};
const EMPTY_TEACHER = {
  nama: "",
  mapel: "",
  role: "Guru Teori",
  foto: "",
  linktree: "",
};
const EMPTY_VIDEO = {
  judul: "",
  deskripsi: "",
  youtubeUrl: "",
};
const EMPTY_GALLERY = { caption: "" };
const DATA_KINDS = ["students", "teachers", "gallery", "videos"];

function getInitialKind(search = window.location.hash.split("?")[1] || "") {
  const kind = new URLSearchParams(search.replace(/^\?/, "")).get("kind");
  return DATA_KINDS.includes(kind) ? kind : "students";
}

function getEmptyForm(kind) {
  if (kind === "students") return EMPTY_STUDENT;
  if (kind === "teachers") return EMPTY_TEACHER;
  if (kind === "gallery") return EMPTY_GALLERY;
  return EMPTY_VIDEO;
}

function getFields(kind) {
  if (kind === "students") {
    return [
      ["nama", "Nama siswa", "text"],
      ["jabatan", "Jabatan", "text"],
      ["foto", "Foto (path asset/ atau URL HTTPS)", "text"],
      ["portfolio", "URL portfolio (opsional)", "url"],
    ];
  }
  if (kind === "teachers") {
    return [
      ["nama", "Nama guru", "text"],
      ["mapel", "Mata pelajaran", "text"],
      ["role", "Role guru", "select"],
      ["foto", "Foto (path asset/ atau URL HTTPS)", "text"],
      ["linktree", "URL Linktree (opsional)", "url"],
    ];
  }
  if (kind === "gallery") return [["caption", "Deskripsi foto", "text"]];
  return [
    ["judul", "Judul video", "text"],
    ["deskripsi", "Deskripsi", "textarea"],
    ["youtubeUrl", "URL YouTube atau ID video", "text"],
  ];
}

function kindLabel(kind) {
  return {
    students: "siswa",
    teachers: "guru",
    gallery: "foto",
    videos: "video",
  }[kind];
}

function recordTitle(kind, record) {
  if (kind === "students" || kind === "teachers") return record.nama;
  return kind === "gallery" ? record.caption : record.judul;
}

function recordDescription(kind, record) {
  if (kind === "students") return record.jabatan || "Siswa";
  if (kind === "teachers") return [record.mapel, record.role].filter(Boolean).join(" · ");
  if (kind === "gallery") return record.isPublished ? "Tampil di galeri publik" : "Tidak tampil di galeri";
  return record.deskripsi || record.youtubeId || "Video kegiatan";
}

function recordImage(kind, record) {
  if (kind === "gallery") return record.url;
  if (kind === "videos" && record.youtubeId) {
    return `https://img.youtube.com/vi/${encodeURIComponent(record.youtubeId)}/hqdefault.jpg`;
  }
  return record.avatar?.url || record.foto || "";
}

function isRecordActive(kind, record) {
  return kind === "students" || kind === "gallery"
    ? record.isPublished
    : record.isActive;
}

export function AdminDataPage({ route }) {
  const { user } = useAuth();
  const [kind, setKind] = useState(() => getInitialKind(route?.search));
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(() => getEmptyForm(getInitialKind(route?.search)));
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  const fields = getFields(kind);
  const isNew = editingId === "new";
  const canManageMedia = user?.role === "admin" && user?.username === "admin";
  const editingRecord = records.find(record => record.id === editingId);
  const activeSection = kind === "students" || kind === "teachers" ? "content" : "media";
  const heading = kind === "students" || kind === "teachers"
    ? "Siswa & guru"
    : "Galeri & video";

  useEffect(() => {
    const requestedKind = getInitialKind(route?.search || "");
    if (requestedKind !== kind) {
      setKind(requestedKind);
      setQuery("");
      setEditingId(null);
      setForm(getEmptyForm(requestedKind));
      setError("");
      setNotice("");
    }
  }, [route?.search]);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    setError("");
    apiRequest(`/api/admin/${kind}`)
      .then(payload => {
        const items = kind === "gallery" ? payload.photos : payload[kind];
        if (!Array.isArray(items)) throw new Error("Respons data tidak valid.");
        if (active) {
          setRecords(items);
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
  }, [kind, revision]);

  const filteredRecords = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return records.filter(record =>
      `${recordTitle(kind, record) || ""} ${recordDescription(kind, record) || ""} ${record.id || ""}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [kind, records, query]);

  function chooseKind(nextKind) {
    setKind(nextKind);
    setQuery("");
    setEditingId(null);
    setForm(getEmptyForm(nextKind));
    setError("");
    setNotice("");
  }

  function startCreate() {
    setEditingId("new");
    setForm(getEmptyForm(kind));
    setError("");
    setNotice("");
  }

  function startEdit(record) {
    setEditingId(record.id);
    if (kind === "students") {
      setForm({
        nama: record.nama || "",
        jabatan: record.jabatan || "",
        facts: record.facts || [],
        foto: record.foto || "",
        portfolio: record.portfolio || "",
      });
    } else if (kind === "teachers") {
      setForm({
        nama: record.nama || "",
        mapel: record.mapel || "",
        role: record.role || "Guru Teori",
        foto: record.foto || "",
        linktree: record.linktree || "",
      });
    } else if (kind === "gallery") {
      setForm({ caption: record.caption || "" });
    } else {
      setForm({
        judul: record.judul || "",
        deskripsi: record.deskripsi || "",
        youtubeUrl: record.youtubeId || "",
      });
    }
    setError("");
    setNotice("");
  }

  async function saveRecord(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const payload = Object.fromEntries(
      Object.entries(form)
        .filter(([key]) => key !== "facts")
        .map(([key, value]) => [key, value.trim()]),
    );
    if (kind === "students") {
      payload.facts = form.facts
        .filter(fact => fact.label.trim() && fact.value.trim())
        .map(fact => ({ label: fact.label.trim(), value: fact.value.trim() }));
      if (form.facts.some(fact =>
        Boolean(fact.label.trim()) !== Boolean(fact.value.trim()),
      )) {
        setError("Isi label dan fakta pada setiap slot yang digunakan.");
        setSaving(false);
        return;
      }
    }
    try {
      const base = `/api/admin/${kind}`;
      await apiRequest(
        isNew ? base : `${base}/${encodeURIComponent(editingId)}`,
        { method: isNew ? "POST" : "PATCH", body: payload },
      );
      setEditingId(null);
      setForm(getEmptyForm(kind));
      setNotice(isNew ? "Data berhasil ditambahkan." : "Perubahan berhasil disimpan.");
      setRevision(value => value + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function setRecordActive(record, active) {
    if (!active && !window.confirm(
      kind === "gallery"
        ? "Hapus foto ini dari galeri publik?"
        : "Arsipkan data ini agar tidak tampil di halaman publik?",
    )) return;
    setError("");
    setNotice("");
    try {
      await apiRequest(`/api/admin/${kind}/${encodeURIComponent(record.id)}`, {
        method: active ? "PATCH" : "DELETE",
        ...(active
          ? {
              body: kind === "students"
                ? { isPublished: true }
                : kind === "gallery"
                  ? {}
                  : { isActive: true },
            }
          : {}),
      });
      setNotice(active
        ? "Data berhasil dipulihkan."
        : kind === "gallery"
          ? "Foto dihapus dari galeri publik."
          : "Data diarsipkan dan tidak tampil di halaman publik.");
      setRevision(value => value + 1);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function handleGalleryUpload(photo) {
    if (!photo) return;
    setRecords(current => [photo, ...current.filter(record => record.id !== photo.id)]);
    setNotice("Foto berhasil ditambahkan ke galeri.");
  }

  return (
    <section className="admin-data-page" aria-busy={status === "loading" || saving}>
      <DashboardSidebar user={user} active={activeSection} />
      <div className="admin-data-main">
        <header className="dashboard-heading">
          <span className="route-label">/admin/data</span>
          <h1>{heading}</h1>
          <p>Kelola informasi yang tampil di website kelas.</p>
        </header>

        <div className="admin-data-tabs" role="group" aria-label="Bagian data admin">
          <button
            type="button"
            className="button-secondary"
            aria-pressed={activeSection === "content"}
            onClick={() => chooseKind("students")}
          >
            Siswa & guru
          </button>
          <button
            type="button"
            className="button-secondary"
            aria-pressed={activeSection === "media"}
            onClick={() => chooseKind("gallery")}
          >
            Galeri & video
          </button>
        </div>
        <div className="admin-data-tabs admin-data-subtabs" role="group" aria-label={heading}>
          {(activeSection === "content" ? ["students", "teachers"] : ["gallery", "videos"]).map(item => (
            <button
              type="button"
              className="button-secondary"
              key={item}
              aria-pressed={kind === item}
              onClick={() => chooseKind(item)}
            >
              {item === "students" ? "Siswa" : item === "teachers" ? "Guru" : item === "gallery" ? "Foto galeri" : "Video"}
            </button>
          ))}
        </div>

        {notice && <p className="admin-data-notice" role="status">{notice}</p>}
        {error && <p className="admin-data-error" role="alert">{error}</p>}

        <div className={`admin-data-layout${editingId ? " is-editing" : ""}`}>
          <section className="admin-data-list" aria-labelledby="admin-records-heading">
            <div className="admin-data-list-heading">
              <div>
                <h2 id="admin-records-heading">
                  {kind === "gallery" ? "Foto galeri" : `Daftar ${kindLabel(kind)}`}
                </h2>
                <p>{filteredRecords.length} data</p>
              </div>
              {kind !== "gallery" && (
                <button type="button" className="button-primary" onClick={startCreate}>
                  Tambah {kindLabel(kind)}
                </button>
              )}
            </div>
            {kind === "gallery" && canManageMedia && (
              <MediaUploader
                targetType="gallery"
                targetId=""
                mediaType="gallery"
                onChanged={handleGalleryUpload}
              />
            )}
            <label className="admin-data-search">
              Cari {kindLabel(kind)}
              <input value={query} onChange={event => setQuery(event.target.value)} type="search" />
            </label>
            {status === "loading" && <p role="status">Memuat data…</p>}
            {status === "error" && (
              <button type="button" className="button-secondary" onClick={() => setRevision(value => value + 1)}>
                Coba muat ulang
              </button>
            )}
            {status === "ready" && (
              <ul className="admin-record-grid">
                {filteredRecords.map(record => {
                  const active = isRecordActive(kind, record);
                  const image = recordImage(kind, record);
                  return (
                    <li key={record.id}>
                      <article className={`admin-record-card${active ? "" : " is-archived"}`}>
                        <div className="admin-record-card-body">
                          {image ? (
                            <img className="admin-record-thumb" src={image} alt="" loading="lazy" />
                          ) : (
                            <span className="admin-record-thumb admin-record-thumb--empty" aria-hidden="true">
                              {recordTitle(kind, record)?.slice(0, 1) || "?"}
                            </span>
                          )}
                          <div className="admin-record-card-copy">
                            <h3 title={recordTitle(kind, record)}>{recordTitle(kind, record) || "Tanpa judul"}</h3>
                            <p>{recordDescription(kind, record)}</p>
                            <small>{active ? "Aktif" : "Diarsipkan"}</small>
                          </div>
                        </div>
                        <div className="admin-record-actions">
                          <button type="button" className="button-secondary" onClick={() => startEdit(record)}>
                            Edit
                          </button>
                          {active ? (
                            <button type="button" className="button-secondary" onClick={() => setRecordActive(record, false)}>
                              {kind === "gallery" ? "Hapus" : "Arsipkan"}
                            </button>
                          ) : kind !== "gallery" ? (
                            <button type="button" className="button-secondary" onClick={() => setRecordActive(record, true)}>
                              Pulihkan
                            </button>
                          ) : null}
                        </div>
                      </article>
                    </li>
                  );
                })}
                {filteredRecords.length === 0 && (
                  <li className="admin-record-empty">
                    <p>Tidak ada data yang cocok.</p>
                    {kind === "gallery" && canManageMedia && <span>Unggah foto pertama melalui panel di atas.</span>}
                  </li>
                )}
              </ul>
            )}
          </section>

          {editingId && (
            <aside className="admin-data-editor" aria-label={`Editor ${kindLabel(kind)}`}>
              <form className="admin-data-form" onSubmit={saveRecord}>
                <div className="admin-data-form-heading">
                  <div>
                    <h2>{isNew ? `Tambah ${kindLabel(kind)}` : "Edit data"}</h2>
                    <p>{isNew ? "Isi data baru di bawah ini." : recordTitle(kind, editingRecord || {})}</p>
                  </div>
                  <button
                    className="admin-data-close"
                    type="button"
                    aria-label="Tutup editor"
                    disabled={saving}
                    onClick={() => setEditingId(null)}
                  >
                    ×
                  </button>
                </div>
                {canManageMedia && !isNew && kind !== "gallery" && (
                  <p className="admin-data-status">Kelola foto profil dan background dari sini.</p>
                )}
                {fields.map(([name, label, type]) => (
                  <label key={name}>
                    {label}
                    {type === "textarea" ? (
                      <textarea
                        name={name}
                        value={form[name]}
                        onChange={event => setForm(current => ({ ...current, [name]: event.target.value }))}
                        rows={3}
                        maxLength={500}
                      />
                    ) : type === "select" ? (
                      <select
                        name={name}
                        value={form[name]}
                        onChange={event => setForm(current => ({ ...current, [name]: event.target.value }))}
                        required
                      >
                        <option value="Guru Teori">Guru Teori</option>
                        <option value="Guru Praktek">Guru Praktek</option>
                      </select>
                    ) : (
                      <input
                        name={name}
                        type={type}
                        value={form[name]}
                        onChange={event => setForm(current => ({ ...current, [name]: event.target.value }))}
                        required={!["portfolio", "linktree", "deskripsi"].includes(name)}
                      />
                    )}
                  </label>
                ))}
                {kind === "students" && (
                  <fieldset className="card-facts-fields">
                    <legend>Fakta siswa (maksimal 5)</legend>
                    {Array.from({ length: 5 }, (_, index) => {
                      const fact = form.facts[index] || { label: "", value: "" };
                      return (
                        <div className="card-fact-editor" key={index}>
                          <span className="card-fact-number">Fakta {index + 1}</span>
                          <label htmlFor={`admin-fact-label-${index}`}>Label</label>
                          <input
                            id={`admin-fact-label-${index}`}
                            maxLength={40}
                            value={fact.label}
                            onChange={event => setForm(current => ({
                              ...current,
                              facts: Array.from({ length: 5 }, (_, factIndex) => ({
                                ...(current.facts[factIndex] || { label: "", value: "" }),
                                ...(factIndex === index ? { label: event.target.value } : {}),
                              })),
                            }))}
                          />
                          <label htmlFor={`admin-fact-value-${index}`}>Isi fakta</label>
                          <input
                            id={`admin-fact-value-${index}`}
                            maxLength={300}
                            value={fact.value}
                            onChange={event => setForm(current => ({
                              ...current,
                              facts: Array.from({ length: 5 }, (_, factIndex) => ({
                                ...(current.facts[factIndex] || { label: "", value: "" }),
                                ...(factIndex === index ? { value: event.target.value } : {}),
                              })),
                            }))}
                          />
                        </div>
                      );
                    })}
                  </fieldset>
                )}
                {canManageMedia && !isNew && kind !== "gallery" && (
                  <>
                    <MediaUploader
                      targetType={kind}
                      targetId={editingId}
                      mediaType="avatar"
                      currentUrl={editingRecord?.avatar?.url || editingRecord?.foto || ""}
                      removable={Boolean(editingRecord?.avatar)}
                      onChanged={media => setRecords(current => current.map(record =>
                        record.id === editingId ? { ...record, avatar: media } : record
                      ))}
                    />
                    <MediaUploader
                      targetType={kind}
                      targetId={editingId}
                      mediaType="background"
                      currentUrl={editingRecord?.background?.url || ""}
                      removable={Boolean(editingRecord?.background)}
                      onChanged={media => setRecords(current => current.map(record =>
                        record.id === editingId ? { ...record, background: media } : record
                      ))}
                    />
                  </>
                )}
                {canManageMedia && isNew && (
                  <p className="admin-data-status">
                    Simpan data terlebih dahulu, lalu edit untuk menambahkan foto.
                  </p>
                )}
                <div className="admin-data-form-actions">
                  <button className="button-primary" type="submit" disabled={saving}>
                    {saving ? "Menyimpan…" : "Simpan"}
                  </button>
                  <button
                    className="button-secondary"
                    type="button"
                    disabled={saving}
                    onClick={() => setEditingId(null)}
                  >
                    Batal
                  </button>
                </div>
              </form>
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}
