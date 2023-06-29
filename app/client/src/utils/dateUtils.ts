const oneDay = 1000 * 60 * 60 * 24;

export function createRelativeDailyTimestampRange(
  base: Date,
  startOffset: number,
  endOffset: number,
) {
  if (startOffset > endOffset) return [];

  const startDateRaw = base.getTime() + startOffset * oneDay;
  const startDate = new Date(
    startDateRaw + getTzOffsetMsecs(new Date(startDateRaw), base),
  );

  const endDateRaw = base.getTime() + endOffset * oneDay;
  const endDate = endDateRaw + getTzOffsetMsecs(new Date(endDateRaw), base);

  const timestampRange: number[] = [];
  let currentDate = startDate.getTime();
  while (currentDate <= endDate) {
    timestampRange.push(currentDate);
    const nextDate = currentDate + oneDay;
    currentDate =
      nextDate - getTzOffsetMsecs(new Date(currentDate), new Date(nextDate));
  }
  return timestampRange;
}

export function createCyanDataObject(today: Date) {
  const startDateRaw = new Date(today.getTime() - 7 * oneDay);
  const startDate = new Date(
    startDateRaw.getTime() + getTzOffsetMsecs(startDateRaw, today),
  );
  const newData: { [date: string]: null } = {};
  let currentDate = startDate.getTime();
  const yesterdayRaw = today.getTime() - oneDay;
  const yesterday =
    yesterdayRaw + getTzOffsetMsecs(new Date(yesterdayRaw), today);
  while (currentDate <= yesterday) {
    newData[currentDate] = null;
    const nextDate = currentDate + oneDay;
    currentDate =
      nextDate - getTzOffsetMsecs(new Date(currentDate), new Date(nextDate));
  }
  return newData;
}

export function epochToMonthDay(epoch: number) {
  const date = new Date(epoch);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function getDayOfYear(date: Date) {
  const firstOfYear = new Date(date.getFullYear(), 0, 0);
  const diff =
    date.getTime() -
    firstOfYear.getTime() +
    getTzOffsetMsecs(firstOfYear, date);
  return Math.floor(diff / oneDay);
}

export function getTzOffsetMsecs(previous: Date, current: Date) {
  return (
    (previous.getTimezoneOffset() - current.getTimezoneOffset()) * 60 * 1000
  );
}

// Converts `year dayOfYear` format to epoch timestamp
export function yearDayStringToEpoch(yearDay: string) {
  const yearAndDay = yearDay.split(' ');
  if (yearAndDay.length !== 2) return null;
  const year = parseInt(yearAndDay[0]);
  const day = parseInt(yearAndDay[1]);
  if (Number.isFinite(year) && Number.isFinite(day)) {
    return new Date(year, 0, day).getTime();
  }
  return null;
}
