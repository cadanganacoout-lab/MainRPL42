const SITE = {
  "schoolName": "SMK PGRI 2 PONOROGO",
  "schoolShort": "STERIDA",
  "className": "XI RPL",
  "majorName": "Rekayasa Perangkat Lunak",
  "waliKelas": "Andies Pramudiyantoro, S.Kom"
};

const MOTIVASI = [
  "Kode yang bersih lahir dari niat yang jujur.",
  "Debug hari ini adalah cerita sukses developer esok hari.",
  "Setiap error adalah petunjuk, bukan jalan buntu.",
  "RPL bukan soal menghafal sintaks, tapi soal cara berpikir.",
  "Belajar logika hari ini, bangun sistem besar suatu hari nanti.",
  "Satu baris kode, satu langkah lebih dekat ke solusi.",
  "Programmer hebat lahir dari ribuan kali mencoba lagi.",
  "Jangan takut merah di terminal, takutlah tidak pernah mencoba.",
  "Kolaborasi seperti git merge: butuh komunikasi, bukan ego.",
  "Fitur boleh selesai, belajar tidak pernah 'commit' terakhir."
];

const UI = {
  "navMenus": {
    "homeLabel": "Home",
    "exploreLabel": "Jelajahi",
    "homeLinks": [
      { "label": "Beranda", "href": "#/beranda?section=home-hero" },
      { "label": "Sorotan Galeri", "href": "#/beranda?section=gallery-spotlight" },
      { "label": "Sorotan Video", "href": "#/beranda?section=video-spotlight" },
      { "label": "Jadwal", "href": "#/beranda?section=agenda-heading" },
      { "label": "Footer", "href": "#/beranda?section=site-footer" }
    ],
    "exploreLinks": [
      { "label": "Siswa", "href": "#/siswa", "page": "siswa" },
      { "label": "Guru", "href": "#/guru", "page": "guru" },
      { "label": "Galeri", "href": "#/galeri", "page": "galeri" },
      { "label": "Video", "href": "#/video", "page": "video" }
    ],
    "loginLabel": "Masuk",
    "registerLabel": "Daftar",
    "registerHref": "#/daftar"
  },
  "links": {
    "class": {
      "website": "https://rpl42sterida.web.id/",
      "instagram": "https://www.instagram.com/codingbudrek/",
      "tiktok": "https://www.tiktok.com/@mondlegank42_",
      "youtube": "https://www.youtube.com/@RPLsterida42"
    },
    "school": {
      "website": "https://smkpgri2ponorogo.sch.id/",
      "instagram": "https://www.instagram.com/smkpgri2ponorogo/",
      "tiktok": "https://www.tiktok.com/@smkspgri2ponorogo",
      "youtube": "https://www.youtube.com/@smkspgri2ponorogo"
    }
  },
  "header": {
    "chatLabel": "Chat anonim",
    "chatOpenLabel": "Buka chat anonim kelas",
    "chatCloseLabel": "Tutup chat",
    "chatTitle": "Chat anonim kelas"
  },
  "home": {
    "welcomeTitle": "WELCOME",
    "welcomeSlogan": "RPL! JAYA JAYA JAYA",
    "welcomeDescription": "Belajar bersama, bertumbuh lewat karya.",
    "exploreTitle": "Jelajahi",
    "exploreAriaLabel": "Pintasan halaman",
    "explore": [
      { "href": "#/siswa", "title": "Siswa", "text": "Kenali teman sekelas", "icon": "users" },
      { "href": "#/guru", "title": "Guru", "text": "Pengajar & mata pelajaran", "icon": "book" }
    ],
    "summaryTitle": "Ringkasan kelas",
    "summary": {
      "studentLabel": "Siswa",
      "teacherLabel": "Guru",
      "homeroomLabel": "Wali kelas"
    },
    "motivationTitle": "Motivasi",
    "motivationAriaLabel": "Motivasi kelas"
  },
  "spotlights": {
    "galleryTitle": "Sorotan Galeri",
    "galleryLinkLabel": "Jelajahi semua foto",
    "galleryLink": "#/galeri",
    "videoTitle": "Sorotan Video",
    "videoLinkLabel": "Lihat semua video",
    "videoLink": "#/video",
    "videoAriaLabel": "Carousel video kelas"
  },
  "footer": {
    "message": "Belajar bersama, bertumbuh lewat karya.",
    "classLinksTitle": "Kelas XI RPL",
    "classWebsiteLabel": "Website Kelas",
    "classSocialLabel": "Media sosial kelas",
    "schoolLinksTitle": "Sekolah",
    "schoolWebsiteLabel": "Website sekolah",
    "schoolWebsitePendingTitle": "Tautan belum diisi",
    "instagramLabel": "Instagram kelas",
    "tiktokLabel": "TikTok kelas",
    "youtubeLabel": "YouTube kelas",
    "schoolSocialLabel": "Media sosial sekolah",
    "schoolInstagramLabel": "Instagram sekolah",
    "schoolTiktokLabel": "TikTok sekolah",
    "schoolYoutubeLabel": "YouTube sekolah",
    "builtWith": "Dibuat dengan semangat RPL"
  }
};

const HARI_LIST = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu"
];

const HARI_AKTIF = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu"
];

window.XIRPL1_DATA = {
  SITE,
  MOTIVASI,
  UI,
  HARI_LIST,
  HARI_AKTIF,
};
