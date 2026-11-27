---
version: alpha
name: XI RPL Class Website
description: >
  Website kelas XI RPL SMK PGRI 2 Ponorogo — platform informasi kelas yang
  menampilkan jadwal, galeri, video, dan profil siswa/guru. Desain mengutamakan
  kejelasan informasi, dukungan tema gelap/terang, dan aksesibilitas.

colors:
  canvas: "#080b10"
  surface: "#10161d"
  surface-raised: "#171f28"
  surface-muted: "#0c1218"
  text-primary: "#f4f3ef"
  text-secondary: "#b0b7c1"
  text-muted: "#8993a0"
  border: "#28313b"
  border-strong: "#3c4651"
  accent: "#e5a84b"
  accent-strong: "#ffc56c"
  accent-soft: "#241a0c"
  accent-border: "#6f4a1b"
  action: "#ffc56c"
  on-action: "#191208"
  success: "#75d6a5"
  warning: "#f2c56a"
  danger: "#ff8691"
  focus: "#ffd27b"
  ring: "color-mix(in srgb, #ffc56c 30%, transparent)"

typography:
  sans:
    fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", sans-serif'
  mono:
    fontFamily: 'ui-monospace, "SFMono-Regular", "Cascadia Mono", Menlo, Consolas, monospace'
  display:
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: clamp(2.5rem, 6vw, 5rem)
    fontWeight: "800"
    lineHeight: "1"
  heading:
    fontWeight: "800"
    lineHeight: "1.08"
  body:
    fontSize: "1rem"
    lineHeight: "1.6"

rounded:
  sm: 8px
  md: 12px
  lg: 16px
  xl: 22px
  pill: 999px

spacing:
  section: clamp(44px, 6vw, 76px)
  header: 68px

components:
  header:
    height: 68px
    background: "color-mix(in srgb, var(--color-canvas) 80%, transparent)"
    backdropFilter: "blur(18px) saturate(140%)"
    position: sticky
  card:
    background: "var(--gradient-glass), var(--gradient-surface)"
    border: "1px solid var(--color-border-strong)"
    borderRadius: var(--radius-xl)
    shadow: var(--shadow-card)
  button-primary:
    background: var(--color-action)
    color: var(--color-on-action)
    minHeight: 46px
    borderRadius: var(--radius-md)
  button-secondary:
    border: "1px solid var(--color-border-strong)"
    minHeight: 46px
    borderRadius: var(--radius-md)
---

## Overview

Website kelas XI RPL adalah platform informasi berbasis React + Vite dengan tema gelap sebagai default dan dukungan tema terang. Palet aksen emas-amber konsisten di seluruh permukaan, dengan tipografi Plus Jakarta Sans untuk heading berat dan UI-monospace untuk data numerik.

## Colors

Gunakan `--color-accent` (#e5a84b gelap / #a7600a terang) sebagai warna aksen tunggal per tampilan. Jangan pakai warna aksen lebih dari satu per permukaan.

Warna `--hue-1` hingga `--hue-6` khusus untuk warna per kartu (`nth-child`), bukan untuk elemen UI tunggal.

## Themes

| Token | Dark | Light |
|---|---|---|
| `--color-canvas` | #080b10 | #f0e5ca |
| `--color-surface` | #10161d | #ffffff |
| `--color-accent` | #e5a84b | #a7600a |
| `--color-action` | #ffc56c | #9a5000 |
| `--color-text-primary` | #f4f3ef | #1a1b1e |
| `--color-text-secondary` | #b0b7c1 | #48505b |

## Typography

- Heading `h1` di hero: `clamp(2.5rem, 6vw, 5rem)`, weight 800, `letter-spacing: -0.055em`, `text-wrap: balance`.
- Heading `h2` section: `clamp(1.5rem, 3vw, 2rem)`, weight 750, `letter-spacing: -0.025em`.
- Teks body paragraph: gunakan `text-wrap: pretty`.
- Teks data dan waktu: gunakan `font-family: var(--font-mono)` dengan `font-variant-numeric: tabular-nums`.
- Label eyebrow / route-label: `font-mono`, `letter-spacing: 0.08em`, `text-transform: uppercase`.

## Layout

- `max-width`: 1120px untuk konten utama, 1240px untuk spotlight galeri/video.
- Container: `width: min(100% - 48px, var(--max-width))`, `margin-inline: auto`.
- Responsif 720px: container menjadi `min(100% - 32px, max-width)`, header 60px.
- Jangan gunakan `h-screen`; gunakan `min-height: 100svh` untuk hero full-screen.

## Elevation & Depth

Tiga tingkat shadow:
- `--shadow-card`: kartu standar (panel, agenda-card).
- `--shadow-lift`: elemen floating yang perlu menonjol.
- `--shadow-pop`: dropdown dan dialog modal.

Header menggunakan `backdrop-filter: blur(18px) saturate(140%)` untuk efek glassmorphism. Panel dan kartu menggunakan `--gradient-glass` overlay di atas `--gradient-surface`.

## Shapes

Tiga radius utama: `--radius-md` (12px) untuk tombol dan item, `--radius-lg` (16px) untuk media/gambar, `--radius-xl` (22px) untuk kartu besar. Gunakan `--radius-pill` (999px) untuk chip, badge, dan hari-picker.

## Components

**Header**: sticky, glassmorphism, 68px tinggi. Navigasi pakai `<details>`/`<summary>` dengan keyboard-dismiss via Escape.

**Card**: background `gradient-glass + gradient-surface`, border `--color-border-strong`, `border-radius: --radius-xl`, `box-shadow: --shadow-card`.

**Button primary**: background `--color-action`, warna teks `--color-on-action`, `min-height: 46px`. Button secondary: bordered, background transparan.

**Search box**: `min-height: 48px`, border-radius pill, focus-ring `--color-ring` dengan `box-shadow: 0 0 0 4px`.

**Chip/filter**: `min-height: 40px`, `aria-pressed` untuk state aktif.

## Do's and Don'ts

- **Jangan** gunakan `letter-spacing` di heading kecuali untuk eyebrow/label monospace.
- **Jangan** animasikan properti layout (width, height, top, margin).
- **Jangan** tambahkan animasi tanpa `prefers-reduced-motion` guard.
- **Jangan** pakai warna aksen lebih dari satu per tampilan.
- **Gunakan** `text-wrap: balance` untuk heading dan `text-wrap: pretty` untuk paragraf.
- **Gunakan** `tabular-nums` untuk angka dan waktu.
- **Gunakan** `aria-label` pada setiap tombol ikon-only.
- **Gunakan** `safe-area-inset` pada elemen fixed di tepi layar.
