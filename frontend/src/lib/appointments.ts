export function getTodayDateString(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

export function isValidAppointmentDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  const parsedDate = new Date(`${date}T00:00:00`);
  const normalizedDate = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}-${String(parsedDate.getDate()).padStart(2, "0")}`;

  return !Number.isNaN(parsedDate.getTime()) &&
    normalizedDate === date &&
    date >= getTodayDateString();
}

export function isValidAppointmentTime(time: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time) &&
    time >= "08:00" &&
    time <= "17:30";
}
