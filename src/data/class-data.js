const classData = window.XIRPL1_DATA;

if (!classData) {
  throw new Error("Class data script must load before the React application.");
}

export const {
  SITE,
  MOTIVASI,
  UI,
  HARI_LIST,
  HARI_AKTIF,
} = classData;
