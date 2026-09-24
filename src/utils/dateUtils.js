const TIMEZONE = 'Asia/Kolkata';

const toIST = (date) => {
  if (!date) return new Date();
  const d = new Date(date);
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 5.5));
};

const getISTNow = () => {
  return toIST(new Date());
};

const getISTStartOfDay = (date) => {
  const d = toIST(date || new Date());
  d.setHours(0, 0, 0, 0);
  return d;
};

const getISTEndOfDay = (date) => {
  const d = toIST(date || new Date());
  d.setHours(23, 59, 59, 999);
  return d;
};

const isWithinDays = (targetDate, days) => {
  const now = getISTNow();
  const target = toIST(targetDate);
  const diffTime = Math.abs(target - now);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays <= days;
};

const addDays = (date, days) => {
  const d = toIST(date);
  d.setDate(d.getDate() + days);
  return d;
};

const formatDateIST = (date) => {
  const d = toIST(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

module.exports = {
  TIMEZONE,
  toIST,
  getISTNow,
  getISTStartOfDay,
  getISTEndOfDay,
  isWithinDays,
  addDays,
  formatDateIST
};
