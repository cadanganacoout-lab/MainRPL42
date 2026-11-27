import React, { useEffect, useMemo, useState } from "react";
import { DashboardSidebar } from "../components/DashboardSidebar.jsx";
import { MediaUploader } from "../components/MediaUploader.jsx";
import { StudentCard } from "../components/StudentCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { apiRequest } from "../lib/api.js";

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const PARITIES = ["ganjil", "genap"];
const DASHBOARD_STATS = [
  ["students", "Siswa", "Orang"],
  ["teachers", "Guru", "Orang"],
  ["photos", "Foto galeri", "Foto"],
  ["videos", "Video", "Video"],
];

function DashboardStats({ summary, error }) {
  return (
    <section className="dashboard-stat-grid" aria-label="Ringkasan data kelas">
      {DASHBOARD_STATS.map(([key, label, unit]) => (
        <article className="dashboard-stat-card" key={key}>
          <span>{label}</span>
          <strong>{summary?.[key] ?? "—"}</strong>
          <small>{summary ? unit : error ? "Belum tersedia" : "Memuat…"}</small>
        </article>
      ))}
    </section>
  );
}

function useDashboardSummary() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest("/api/dashboard/summary")
      .then(payload => {
        if (active) setSummary(payload);
      })
      .catch(requestError => {
        if (active) setError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, []);

  return { summary, error };
}

function StudentDashboard({ user, summary, summaryError }) {
  const [card, setCard] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest("/api/cards/me")
      .then(payload => {
        if (!payload.card) throw new Error("Card belum tertaut ke akun ini.");
        if (active) {
          setCard(payload.card);
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
  }, []);

  return (
    <div className="dashboard-user-content">
      <header className="dashboard-heading">
        <span className="route-label">DASHBOARD SISWA</span>
        <h1>Halo, {user.displayName}</h1>
        <p>Ringkasan kelas dan informasi card yang terhubung ke akun Anda.</p>
      </header>
      <DashboardStats summary={summary} error={summaryError} />
      <section className="dashboard-panel" aria-labelledby="student-card-title">
        <div className="dashboard-panel-heading">
          <div>
            <h2 id="student-card-title">Card saya</h2>
            <p>Edit fakta dan foto pada card Anda. Nama dan jabatan dikelola admin.</p>
          </div>
          <a className="button-primary" href="#/card-saya">Edit card</a>
        </div>
        {status === "loading" && <p role="status">Memuat card…</p>}
        {status === "error" && <p className="admin-data-error" role="alert">{error}</p>}
        {status === "ready" && card && <StudentCard student={card} />}
      </section>
    </div>
  );
}

function MemberDashboard({ user, summary, summaryError }) {
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [profileVisible, setProfileVisible] = useState(true);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState("loading");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest("/api/profile/me")
      .then(payload => {
        if (active) {
          setProfile(payload.user);
          setDisplayName(payload.user.displayName);
          setProfileVisible(payload.user.profileVisible !== false);
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
  }, []);

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = await apiRequest("/api/profile/me", {
        method: "PATCH",
        body: { displayName: displayName.trim(), profileVisible },
      });
      setProfile(payload.user);
      setDisplayName(payload.user.displayName);
      setProfileVisible(payload.user.profileVisible !== false);
      setNotice("Informasi profil berhasil disimpan.");
      setEditing(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dashboard-user-content">
      <header className="dashboard-heading">
        <span className="route-label">DASHBOARD TAMU</span>
        <h1>Halo, {user.displayName}</h1>
        <p>Lihat ringkasan kelas dan atur informasi profil Anda sendiri.</p>
      </header>
      <DashboardStats summary={summary} error={summaryError} />
      <section className="dashboard-panel" aria-labelledby="member-profile-title">
        <div className="dashboard-panel-heading">
          <div>
            <h2 id="member-profile-title">Informasi saya</h2>
            <p>Profil dapat disembunyikan dari daftar tamu publik kapan saja.</p>
          </div>
          {status === "ready" && profile && !editing && (
            <button
              className="button-primary"
              type="button"
              onClick={() => {
                setDisplayName(profile.displayName);
                setProfileVisible(profile.profileVisible !== false);
                setError("");
                setNotice("");
                setEditing(true);
              }}
            >
              Edit profil
            </button>
          )}
        </div>
        {status === "loading" && <p role="status">Memuat profil…</p>}
        {status === "error" && <p className="admin-data-error" role="alert">{error}</p>}
        {status === "ready" && profile && (
          <div className={`dashboard-profile-layout${editing ? " is-editing" : ""}`}>
            <section className="dashboard-profile-summary" aria-label="Ringkasan profil">
              {profile.avatar?.url ? (
                <img src={profile.avatar.url} alt="" />
              ) : (
                <span className="dashboard-profile-avatar" aria-hidden="true">
                  {(profile.displayName || user.username).slice(0, 1).toUpperCase()}
                </span>
              )}
              <div>
                <span>Nama tampilan</span>
                <strong>{profile.displayName}</strong>
                <p>
                  Profil publik {profile.profileVisible === false ? "disembunyikan" : "ditampilkan"}.
                </p>
              </div>
            </section>
            {editing && (
              <aside className="dashboard-profile-editor" aria-label="Edit informasi profil">
                <form className="dashboard-profile-form" onSubmit={saveProfile} aria-busy={saving}>
                  <div className="dashboard-profile-editor-heading">
                    <h3>Edit profil</h3>
                    <button
                      className="admin-data-close"
                      type="button"
                      aria-label="Tutup editor profil"
                      disabled={saving}
                      onClick={() => {
                        setDisplayName(profile.displayName);
                        setProfileVisible(profile.profileVisible !== false);
                        setEditing(false);
                        setError("");
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <label htmlFor="dashboard-display-name">Nama tampilan</label>
                  <input
                    id="dashboard-display-name"
                    name="displayName"
                    value={displayName}
                    maxLength={40}
                    required
                    autoComplete="name"
                    onChange={event => setDisplayName(event.target.value)}
                  />
                  <label className="dashboard-privacy-toggle" htmlFor="dashboard-profile-visible">
                    <input
                      id="dashboard-profile-visible"
                      name="profileVisible"
                      type="checkbox"
                      checked={profileVisible}
                      onChange={event => setProfileVisible(event.target.checked)}
                    />
                    <span>Tampilkan profil saya di daftar tamu publik</span>
                  </label>
                  <p className="dashboard-help">
                    Jika dimatikan, nama dan foto Anda tidak ditampilkan dalam direktori publik.
                  </p>
                  {error && <p className="admin-data-error" role="alert">{error}</p>}
                  <button className="button-primary" type="submit" disabled={saving}>
                    {saving ? "Menyimpan…" : "Simpan profil"}
                  </button>
                </form>
                <MediaUploader
                  targetType="member"
                  targetId="me"
                  mediaType="avatar"
                  currentUrl={profile.avatar?.url || ""}
                  removable={Boolean(profile.avatar)}
                  onChanged={avatar => setProfile(current => ({ ...current, avatar }))}
                />
              </aside>
            )}
          </div>
        )}
        {notice && <p className="admin-data-notice" role="status">{notice}</p>}
      </section>
    </div>
  );
}

function emptyAgendaError(requestError) {
  return requestError.code === "AGENDA_NOT_CONFIGURED"
    ? "Jadwal belum dimigrasikan ke database. Jalankan migrasi agenda terlebih dahulu."
    : requestError.message;
}

function AgendaTable({ agenda, parity, day, teachers, students, mode, onChange }) {
  const schedule = mode === "schedule";
  const slots = schedule
    ? agenda.schedule[parity][day]
    : agenda.duties[day];
  const caption = `${schedule ? `Jadwal minggu ${parity}` : "Piket"} hari ${day}`;

  return (
    <div
      className="dashboard-table-wrap"
      tabIndex={0}
      role="region"
      aria-label={caption}
    >
      <table className="dashboard-agenda-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Slot</th>
            {schedule ? (
              <>
                <th scope="col">Jenis</th>
                <th scope="col">Mulai</th>
                <th scope="col">Selesai</th>
                <th scope="col">Mata pelajaran / teks</th>
                <th scope="col">Guru</th>
              </>
            ) : (
              <>
                <th scope="col">Siswa</th>
                <th scope="col">Keterangan</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot, index) => {
            if (!schedule) {
              return (
                <tr key={index}>
                  <th scope="row">{index + 1}</th>
                  <td>
                    <select
                      aria-label={`Siswa piket ${day}, slot ${index + 1}`}
                      value={slot?.studentId || ""}
                      onChange={event => onChange(day, index, "studentId", event.target.value)}
                    >
                      <option value="">Pilih siswa</option>
                      {students.map(student => (
                        <option value={student.id} key={student.id}>{student.nama}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      aria-label={`Keterangan piket ${day}, slot ${index + 1}`}
                      value={slot?.text || ""}
                      maxLength={300}
                      onChange={event => onChange(day, index, "text", event.target.value)}
                    />
                  </td>
                </tr>
              );
            }

            const type = slot?.text ? "text" : slot?.istirahat ? "break" : "lesson";
            return (
              <tr key={index}>
                <th scope="row">{index + 1}</th>
                <td>
                  <select
                    aria-label={`Jenis jadwal ${day}, slot ${index + 1}`}
                    value={type}
                    onChange={event => onChange(day, index, "kind", event.target.value)}
                  >
                    <option value="lesson">Pelajaran</option>
                    <option value="break">Istirahat</option>
                    <option value="text">Teks bebas</option>
                  </select>
                </td>
                <td>
                  <input
                    type="time"
                    aria-label={`Waktu mulai ${day}, slot ${index + 1}`}
                    value={slot?.mulai || ""}
                    disabled={type === "text"}
                    onChange={event => onChange(day, index, "mulai", event.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="time"
                    aria-label={`Waktu selesai ${day}, slot ${index + 1}`}
                    value={slot?.selesai || ""}
                    disabled={type === "text"}
                    onChange={event => onChange(day, index, "selesai", event.target.value)}
                  />
                </td>
                <td>
                  <input
                    aria-label={`Nama pelajaran atau teks ${day}, slot ${index + 1}`}
                    value={slot?.text || slot?.label || slot?.mapel || ""}
                    maxLength={type === "break" ? 120 : 300}
                    onChange={event => onChange(day, index, type === "text" ? "text" : type === "break" ? "label" : "mapel", event.target.value)}
                  />
                </td>
                <td>
                  <select
                    aria-label={`Guru ${day}, slot ${index + 1}`}
                    value={slot?.teacherId || ""}
                    disabled={type !== "lesson"}
                    onChange={event => onChange(day, index, "teacherId", event.target.value)}
                  >
                    <option value="">Pilih guru</option>
                    {teachers.map(teacher => (
                      <option value={teacher.id} key={teacher.id}>{teacher.nama}</option>
                    ))}
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function cleanAgenda(agenda) {
  const cleanSlot = slot => {
    if (!slot) return null;
    if (slot.text?.trim()) return { text: slot.text.trim() };
    if (slot.istirahat) {
      if (!slot.mulai && !slot.selesai && !slot.label) return null;
      return {
        mulai: slot.mulai || undefined,
        selesai: slot.selesai || undefined,
        istirahat: true,
        label: slot.label?.trim() || "Istirahat",
      };
    }
    if (!slot.mulai && !slot.selesai && !slot.mapel && !slot.teacherId) return null;
    return {
      mulai: slot.mulai || undefined,
      selesai: slot.selesai || undefined,
      mapel: slot.mapel?.trim() || undefined,
      teacherId: slot.teacherId || null,
    };
  };
  const cleanDays = days => Object.fromEntries(DAYS.map(day => [
    day,
    days[day].map(cleanSlot),
  ]));
  const cleanDuties = Object.fromEntries(DAYS.map(day => [
    day,
    agenda.duties[day].map(slot => {
      if (!slot) return null;
      if (slot.studentId) return { studentId: slot.studentId };
      return slot.text?.trim() ? { text: slot.text.trim() } : null;
    }),
  ]));
  return {
    classId: agenda.classId,
    className: agenda.className,
    academicYear: agenda.academicYear,
    schedule: Object.fromEntries(PARITIES.map(parity => [
      parity,
      cleanDays(agenda.schedule[parity]),
    ])),
    duties: cleanDuties,
  };
}

function AgendaEditor({ mode }) {
  const [agenda, setAgenda] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [parity, setParity] = useState("ganjil");
  const [activeDay, setActiveDay] = useState(DAYS[0]);
  const [status, setStatus] = useState("loading");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    setError("");
    Promise.all([
      apiRequest("/api/admin/agenda"),
      apiRequest("/api/teachers"),
      apiRequest("/api/cards"),
    ])
      .then(([agendaPayload, teacherPayload, studentPayload]) => {
        if (!agendaPayload.agenda) throw new Error("Respons agenda tidak valid.");
        if (!Array.isArray(teacherPayload.teachers) || !Array.isArray(studentPayload.cards)) {
          throw new Error("Respons data referensi tidak valid.");
        }
        if (active) {
          setAgenda(agendaPayload.agenda);
          setTeachers(teacherPayload.teachers);
          setStudents(studentPayload.cards);
          setStatus("ready");
        }
      })
      .catch(requestError => {
        if (active) {
          setError(emptyAgendaError(requestError));
          setStatus("error");
        }
      });
    return () => {
      active = false;
    };
  }, [retry]);

  function updateSlot(day, index, field, value) {
    setAgenda(current => {
      if (!current) return current;
      if (mode === "schedule") {
        const rows = [...current.schedule[parity][day]];
        const slot = rows[index] || {};
        if (field === "kind") {
          rows[index] = value === "text"
            ? { text: slot.text || "" }
            : value === "break"
              ? { mulai: slot.mulai || "", selesai: slot.selesai || "", istirahat: true, label: slot.label || "Istirahat" }
              : { mulai: slot.mulai || "", selesai: slot.selesai || "", mapel: slot.mapel || "", teacherId: slot.teacherId || null };
        } else {
          rows[index] = { ...slot, [field]: value };
        }
        return {
          ...current,
          schedule: {
            ...current.schedule,
            [parity]: {
              ...current.schedule[parity],
              [day]: rows,
            },
          },
        };
      }

      const rows = [...current.duties[day]];
      const slot = rows[index] || {};
      rows[index] = { ...slot, [field]: value || null };
      if (field === "studentId" && value) delete rows[index].text;
      if (field === "text" && value) delete rows[index].studentId;
      return { ...current, duties: { ...current.duties, [day]: rows } };
    });
    setNotice("");
  }

  async function saveAgenda(event) {
    event.preventDefault();
    if (!agenda) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = await apiRequest("/api/admin/agenda", {
        method: "PUT",
        body: cleanAgenda(agenda),
      });
      setAgenda(payload.agenda);
      setNotice("Perubahan agenda berhasil disimpan.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="dashboard-panel dashboard-agenda-editor" aria-busy={status === "loading" || saving}>
      <div className="dashboard-panel-heading">
        <div>
          <h2>{mode === "schedule" ? "Jadwal pelajaran" : "Piket kelas"}</h2>
          <p>Setiap hari memiliki 15 slot. Slot kosong tidak ditampilkan di beranda.</p>
        </div>
      </div>
      {status === "loading" && <p role="status">Memuat data agenda…</p>}
      {status === "error" && (
        <div className="student-list-message" role="alert">
          <p>{error}</p>
          <button type="button" className="button-secondary" onClick={() => setRetry(value => value + 1)}>
            Coba muat ulang
          </button>
        </div>
      )}
      {status === "ready" && agenda && (
        <form onSubmit={saveAgenda}>
          {mode === "schedule" && (
            <fieldset className="dashboard-parity">
              <legend>Semester</legend>
              {PARITIES.map(value => (
                <label key={value}>
                  <input
                    type="radio"
                    name="schedule-parity"
                    value={value}
                    checked={parity === value}
                    onChange={() => setParity(value)}
                  />
                  Minggu {value}
                </label>
              ))}
            </fieldset>
          )}
          <div className="dashboard-agenda-meta">
            <label>
              Nama kelas
              <input
                value={agenda.className}
                maxLength={80}
                required
                onChange={event => setAgenda(current => ({ ...current, className: event.target.value }))}
              />
            </label>
            <label>
              Tahun ajaran
              <input
                value={agenda.academicYear}
                maxLength={20}
                required
                onChange={event => setAgenda(current => ({ ...current, academicYear: event.target.value }))}
              />
            </label>
          </div>
          <div className="dashboard-agenda-day-tabs" role="group" aria-label="Pilih hari">
            {DAYS.map(day => (
              <button
                type="button"
                key={day}
                className="dashboard-agenda-day-button"
                aria-pressed={activeDay === day}
                onClick={() => setActiveDay(day)}
              >
                {day}
              </button>
            ))}
          </div>
          <AgendaTable
            key={`${mode}-${activeDay}`}
            agenda={agenda}
            parity={parity}
            day={activeDay}
            teachers={teachers}
            students={students}
            mode={mode}
            onChange={updateSlot}
          />
          {error && <p className="admin-data-error" role="alert">{error}</p>}
          {notice && <p className="admin-data-notice" role="status">{notice}</p>}
          <button className="button-primary" type="submit" disabled={saving}>
            {saving ? "Menyimpan…" : "Simpan agenda"}
          </button>
        </form>
      )}
    </section>
  );
}

function AccountManager() {
  const [accounts, setAccounts] = useState([]);
  const [usernames, setUsernames] = useState({});
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [status, setStatus] = useState("loading");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    apiRequest("/api/admin/accounts")
      .then(payload => {
        if (!Array.isArray(payload.accounts)) throw new Error("Respons akun tidak valid.");
        if (active) {
          setAccounts(payload.accounts);
          setUsernames(Object.fromEntries(payload.accounts.map(account => [account.id, account.username])));
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

  async function saveUsername(account) {
    setBusyId(account.id);
    setError("");
    setNotice("");
    setTemporaryPassword("");
    try {
      const payload = await apiRequest(`/api/admin/accounts/${encodeURIComponent(account.id)}`, {
        method: "PATCH",
        body: { username: usernames[account.id] },
      });
      setAccounts(current => current.map(item => item.id === account.id
        ? { ...item, username: payload.account.username }
        : item));
      setUsernames(current => ({ ...current, [account.id]: payload.account.username }));
      setNotice(`Username ${account.card?.nama || account.displayName} berhasil diperbarui.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyId("");
    }
  }

  async function resetPassword(account) {
    if (!window.confirm(`Reset password akun ${account.username}? Akun akan diminta mengganti password saat masuk.`)) return;
    setBusyId(account.id);
    setError("");
    setNotice("");
    setTemporaryPassword("");
    try {
      const payload = await apiRequest(`/api/admin/accounts/${encodeURIComponent(account.id)}/reset-password`, {
        method: "POST",
        body: {},
      });
      setTemporaryPassword(`${payload.username}: ${payload.temporaryPassword}`);
      setNotice("Password sementara hanya ditampilkan sekarang. Sampaikan secara pribadi kepada siswa.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="dashboard-panel">
      <div className="dashboard-panel-heading">
        <div>
          <h2>Akun siswa</h2>
          <p>Username dapat diperbarui. Password lama tidak dapat dilihat; reset menghasilkan password sementara.</p>
        </div>
      </div>
      {error && <p className="admin-data-error" role="alert">{error}</p>}
      {notice && <p className="admin-data-notice" role="status">{notice}</p>}
      {temporaryPassword && (
        <p className="dashboard-temporary-password" role="status">
          Password sementara: <code>{temporaryPassword}</code>
        </p>
      )}
      {status === "loading" && <p role="status">Memuat akun siswa…</p>}
      {status === "error" && (
        <button type="button" className="button-secondary" onClick={() => setRetry(value => value + 1)}>
          Coba muat ulang
        </button>
      )}
      {status === "ready" && (
        <div className="dashboard-account-list">
          {accounts.map(account => (
            <article className="dashboard-account-card" key={account.id}>
              <div>
                <h3>{account.card?.nama || account.displayName}</h3>
                <p>{account.card?.id || "Card tidak tertaut"}</p>
              </div>
              <label>
                Username
                <input
                  value={usernames[account.id] || ""}
                  minLength={3}
                  maxLength={20}
                  pattern="[a-z0-9_]{3,20}"
                  autoComplete="off"
                  onChange={event => setUsernames(current => ({ ...current, [account.id]: event.target.value }))}
                />
              </label>
              <div className="dashboard-account-actions">
                <button
                  className="button-secondary"
                  type="button"
                  disabled={Boolean(busyId)}
                  onClick={() => saveUsername(account)}
                >
                  Simpan username
                </button>
                <button
                  className="button-secondary"
                  type="button"
                  disabled={Boolean(busyId)}
                  onClick={() => resetPassword(account)}
                >
                  Reset password
                </button>
              </div>
            </article>
          ))}
          {accounts.length === 0 && <p className="empty-note">Belum ada akun siswa aktif.</p>}
        </div>
      )}
    </section>
  );
}

const ADMIN_QUICK_LINKS = [
  { label: "Siswa & guru", description: "Edit profil siswa dan daftar guru.", href: "#/admin/data?kind=students" },
  { label: "Galeri & video", description: "Unggah foto kegiatan dan tautan video.", href: "#/admin/data?kind=gallery" },
  { label: "Akun siswa", description: "Atur username dan reset password.", href: "#/admin?tab=accounts" },
  { label: "Jadwal & piket", description: "Perbarui jadwal pelajaran dan piket.", href: "#/admin?tab=schedule" },
];

function AdminDashboard({ route, user, summary, summaryError }) {
  const tab = useMemo(() => {
    const query = route?.search || window.location.hash.split("?")[1] || "";
    const selected = new URLSearchParams(query.replace(/^\?/, "")).get("tab");
    return ["accounts", "schedule", "duties"].includes(selected) ? selected : "overview";
  }, [route?.search]);
  const titles = {
    overview: ["Dashboard admin", "Ringkasan dan pengelolaan data kelas."],
    accounts: ["Akun siswa", "Kelola username dan reset password akun yang tertaut ke card."],
    schedule: ["Jadwal pelajaran", "Kelola 15 slot jadwal untuk setiap hari dan semester."],
    duties: ["Piket kelas", "Kelola 15 slot piket untuk setiap hari."],
  };

  return (
    <section className="dashboard-page">
      <DashboardSidebar user={user} active={tab} />
      <div className="dashboard-main">
        <header className="dashboard-heading">
          <span className="route-label">PANEL ADMIN</span>
          <h1>{titles[tab][0]}</h1>
          <p>{titles[tab][1]}</p>
        </header>
        {tab === "overview" && (
          <>
            <DashboardStats summary={summary} error={summaryError} />
            <section className="dashboard-panel" aria-labelledby="admin-quick-links-heading">
              <div className="dashboard-panel-heading">
                <div>
                  <h2 id="admin-quick-links-heading">Akses cepat</h2>
                  <p>Pilih bagian yang ingin dikelola.</p>
                </div>
              </div>
              <nav className="dashboard-quick-links" aria-label="Menu pengelolaan admin">
                {ADMIN_QUICK_LINKS.map(link => (
                  <a className="dashboard-quick-link" href={link.href} key={link.href}>
                    <strong>{link.label}</strong>
                    <small>{link.description}</small>
                  </a>
                ))}
              </nav>
            </section>
          </>
        )}
        {tab === "accounts" && <AccountManager />}
        {tab === "schedule" && <AgendaEditor mode="schedule" />}
        {tab === "duties" && <AgendaEditor mode="duties" />}
      </div>
    </section>
  );
}

export function DashboardPage({ route }) {
  const { user } = useAuth();
  const { summary, error } = useDashboardSummary();

  if (user.role === "admin") {
    return <AdminDashboard route={route} user={user} summary={summary} summaryError={error} />;
  }
  if (user.role === "student") {
    return <section className="dashboard-page dashboard-page--user">
      <DashboardSidebar user={user} active="overview" />
      <div className="dashboard-main">
        <StudentDashboard user={user} summary={summary} summaryError={error} />
      </div>
    </section>;
  }
  return <section className="dashboard-page dashboard-page--user">
    <DashboardSidebar user={user} active="overview" />
    <div className="dashboard-main">
      <MemberDashboard user={user} summary={summary} summaryError={error} />
    </div>
  </section>;
}
