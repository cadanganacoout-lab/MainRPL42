import React, { useEffect, useState } from "react";
import { SITE } from "../data/class-data.js";
import { apiRequest } from "../lib/api.js";

function VideoPlayer({ video, autoplay = false }) {
  const [playing, setPlaying] = useState(autoplay);
  const id = encodeURIComponent(video.youtubeId);

  return (
    <div className="video-frame">
      {playing ? (
        <iframe
          src={`https://www.youtube.com/embed/${id}?autoplay=1`}
          title={video.judul}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          className="video-play"
          type="button"
          aria-label={`Putar video: ${video.judul}`}
          onClick={() => setPlaying(true)}
        >
          <img
            className="video-poster"
            src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
            alt=""
            loading="lazy"
            decoding="async"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          <span className="video-play-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5Z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}

export function VideosPage() {
  const classLabel = SITE.className.split(" ")[0];
  const query = window.location.hash.split("?")[1] || "";
  const selectedVideoId = new URLSearchParams(query).get("id");
  const [videos, setVideos] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    setError("");
    apiRequest("/api/videos")
      .then(payload => {
        if (!Array.isArray(payload.videos)) throw new Error("Respons video tidak valid.");
        if (active) {
          setVideos(payload.videos);
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

  const selectedVideo = videos.find(video => video.id === selectedVideoId);

  useEffect(() => {
    if (!selectedVideo) return undefined;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`video-${selectedVideo.id}`)?.scrollIntoView({
        block: "center",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedVideo]);

  return (
    <>
      <section className="container page-hero">
        <span className="route-label">/video</span>
        <h1>Video Kegiatan</h1>
        <p>
          Dokumentasi dan materi belajar kelas XI RPL. Pilih video untuk memutar di sini,
          atau buka langsung di YouTube.
        </p>
      </section>
      <section className="container" aria-busy={status === "loading"}>
        {status === "loading" && <p className="admin-data-status" role="status">Memuat video…</p>}
        {status === "error" && (
          <div className="student-list-message" role="alert">
            <p>{error}</p>
            <button type="button" className="button-secondary" onClick={() => setRetry(value => value + 1)}>
              Coba muat ulang
            </button>
          </div>
        )}
        <p className="video-count">{videos.length} video untuk ditonton</p>
        <div className="video-grid">
          {videos.map((video) => (
            <article
              className={`video-card${video.id === selectedVideoId ? " is-selected" : ""}`}
              id={`video-${video.id}`}
              key={video.id}
            >
              <VideoPlayer video={video} autoplay={video.id === selectedVideoId} />
              <div className="video-info">
                <div className="video-avatar" aria-hidden="true">{classLabel}</div>
                <div className="video-text">
                  <h2 className="video-title">{video.judul}</h2>
                  <p className="video-meta">Kelas XI RPL · {video.deskripsi}</p>
                  <a
                    className="video-external-link"
                    href={`https://www.youtube.com/watch?v=${encodeURIComponent(video.youtubeId)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Buka di YouTube
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M7 17 17 7M8 7h9v9" />
                    </svg>
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
        {status === "ready" && videos.length === 0 && (
          <p className="empty-note" role="status">Belum ada video kegiatan.</p>
        )}
      </section>
    </>
  );
}
