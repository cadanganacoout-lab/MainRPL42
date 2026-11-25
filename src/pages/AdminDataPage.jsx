import React, { useEffect, useMemo, useState } from "react";
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

function getInitialKind() {
  const kind = new URLSearchParams(window.location.hash.split("?")[1] || "").get("kind");
  return ["students", "teachers", "videos"].includes(kind) ? kind : "students";
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
  return [
    ["judul", "Judul video", "text"],
    ["deskripsi", "Deskripsi", "textarea"],
    ["youtubeUrl", "URL YouTube atau ID video", "text"],
  ];
}

export function AdminDataPage() {
  const { user } = useAuth();
  const [kind, setKind] = useState(getInitialKind);
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_STUDENT);
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  const fields = getFields(kind);
  const isNew = editingId === "new";
  const canManageMedia = user?.role === "admin" && user?.username === "admin";
  const editingRecord = records.find(record => record.id === editingId);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    setError("");
    apiRequest(`/api/admin/${kind}`)
      .then(payload => {
        const items = payload[kind];
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
      `${record.nama || record.judul || ""} ${record.jabatan || record.mapel || record.deskripsi || ""}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [records, query]);

  function chooseKind(nextKind) {
    setKind(nextKind);
    setQuery("");
    setEditingId(null);
    setForm(nextKind === "students" ? EMPTY_STUDENT : nextKind === "teachers" ? EMPTY_TEACHER : EMPTY_VIDEO);
    setError("");
    setNotice("");
  }

  function startCreate() {
    setEditingId("new");
    setForm(kind === "students" ? EMPTY_STUDENT : kind === "teachers" ? EMPTY_TEACHER : EMPTY_VIDEO);
    setError("");
    setNotice("");
  }

  function startEdit(record) {
    setEditingId(record.id);
    setForm(
      kind === "students"
        ? {
            nama: record.nama,
            jabatan: record.jabatan,
            facts: record.facts || [],
            foto: record.foto,
            portfolio: record.portfolio || "",
          }
        : kind === "teachers"
          ? {
            nama: record.nama,
            mapel: record.mapel,
            role: record.role,
            foto: record.foto,
            linktree: record.linktree || "",
          }
          : {
            judul: record.judul,
            deskripsi: record.deskripsi || "",
            youtubeUrl: record.youtubeId,
          },
    );
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
      setForm(kind === "students" ? EMPTY_STUDENT : kind === "teachers" ? EMPTY_TEACHER : EMPTY_VIDEO);
      setNotice(isNew ? "Data berhasil ditambahkan." : "Perubahan berhasil disimpan.");
      setRevision(value => value + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function setRecordActive(record, active) {
    setError("");
    setNotice("");
    try {
      await apiRequest(`/api/admin/${kind}/${encodeURIComponent(record.id)}`, {
        method: active ? "PATCH" : "DELETE",
        ...(active
          ? { body: kind === "students" ? { isPublished: true } : kind === "teachers" ? { isActive: true } : { isActive: true } }
          : {}),
      });
      setNotice(active ? "Data berhasil dipulihkan." : "Data diarsipkan dan tidak tampil di halaman publik.");
      setRevision(value => value + 1);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
      <section className="container admin-data-page" aria-busy={status === "loading" || saving}>
        <nav className="dashboard-sidebar" aria-label="Navigasi dashboard admin">
          <a href="#/admin">Ringkasan</a>
          <a href="#/admin/data?kind=students" aria-current={kind === "students" ? "page" : undefined}>Siswa</a>
          <a href="#/admin/data?kind=teachers" aria-current={kind === "teachers" ? "page" : undefined}>Guru</a>
          <a href="#/galeri">Galeri</a>
          <a href="#/admin/data?kind=videos" aria-current={kind === "videos" ? "page" : undefined}>Video</a>
          <a href="#/admin?tab=accounts">Akun siswa</a>
          <a href="#/admin?tab=schedule">Jadwal pelajaran</a>
          <a href="#/admin?tab=duties">Piket kelas</a>
        </nav>
        <div className="admin-data-main">
          <header className="dashboard-heading">
            <span className="route-label">/admin/data</span>
            <h1>{kind === "students" ? "Data siswa" : kind === "teachers" ? "Data guru" : "Video"}</h1>
            <p>Kelola informasi yang tampil di website kelas.</p>
          </header>
        <div className="admin-data-tabs" role="group" aria-label="Jenis data">
          <button type="button" className="button-secondary" aria-pressed={kind === "students"} onClick={() => chooseKind("students")}>
            Data siswa
          </button>
          <button type="button" className="button-secondary" aria-pressed={kind === "teachers"} onClick={() => chooseKind("teachers")}>
            Data guru
          </button>
          <button type="button" className="button-secondary" aria-pressed={kind === "videos"} onClick={() => chooseKind("videos")}>
            Video
          </button>
        </div>

        {notice && <p className="admin-data-notice" role="status">{notice}</p>}
        {error && <p className="admin-data-error" role="alert">{error}</p>}

        <div className="admin-data-layout">
          <section className="admin-data-list" aria-labelledby="admin-records-heading">
            <div className="admin-data-list-heading">
              <h2 id="admin-records-heading">{kind === "students" ? "Daftar siswa" : kind === "teachers" ? "Daftar guru" : "Daftar video"}</h2>
              <button type="button" className="button-primary" onClick={startCreate}>
                Tambah {kind === "students" ? "siswa" : kind === "teachers" ? "guru" : "video"}
              </button>
            </div>
            <label className="admin-data-search">
              Cari {kind === "students" ? "siswa" : kind === "teachers" ? "guru" : "video"}
              <input value={query} onChange={event => setQuery(event.target.value)} type="search" />
            </label>
            {status === "loading" && <p role="status">Memuat data…</p>}
            {status === "error" && (
              <button type="button" className="button-secondary" onClick={() => setRevision(value => value + 1)}>
                Coba muat ulang
              </button>
            )}
            {status === "ready" && (
              <ul className="admin-record-list">
                {filteredRecords.map(record => {
                  const active = kind === "students" ? record.isPublished : record.isActive;
                  return (
                    <li key={record.id} className={!active ? "is-archived" : ""}>
                      {kind === "videos" ? (
                        <img
                          className="admin-record-thumb"
                          src={`https://img.youtube.com/vi/${encodeURIComponent(record.youtubeId)}/hqdefault.jpg`}
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <img className="admin-record-thumb" src={record.avatar?.url || record.foto} alt="" loading="lazy" />
                      )}
                      <div>
                        <strong>{record.nama || record.judul}</strong>
                        <span>
                          {kind === "students"
                            ? record.jabatan
                            : kind === "teachers"
                              ? `${record.mapel} · ${record.role}`
                              : record.deskripsi || record.youtubeId}
                        </span>
                        <small>{active ? "Tampil publik" : "Diarsipkan"} · {record.id}</small>
                      </div>
                      <div className="admin-record-actions">
                        <button type="button" className="button-secondary" onClick={() => startEdit(record)}>
                          Edit
                        </button>
                        {active ? (
                          <button type="button" className="button-secondary" onClick={() => setRecordActive(record, false)}>
                            Arsipkan
                          </button>
                        ) : (
                          <button type="button" className="button-secondary" onClick={() => setRecordActive(record, true)}>
                            Pulihkan
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
                {filteredRecords.length === 0 && <li>Tidak ada data yang cocok.</li>}
              </ul>
            )}
          </section>

          {editingId && (
            <form className="admin-data-form" onSubmit={saveRecord}>
              <h2>{isNew ? `Tambah ${kind === "students" ? "siswa" : kind === "teachers" ? "guru" : "video"}` : "Edit data"}</h2>
              {canManageMedia && !isNew && (
                <p className="admin-data-status">Mode Admin — mengelola media milik record ini.</p>
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
                      maxLength={name === "catatan" ? 500 : 500}
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
              {canManageMedia && !isNew && (
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
                  Simpan data terlebih dahulu, lalu pilih Edit untuk menambahkan foto.
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
          )}
        </div>
        </div>
      </section>
  );
}
