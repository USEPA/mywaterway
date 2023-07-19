const ONE_DAY = 1000 * 60 * 60 * 24;

/**
 * Creates a range of timestamps spaced a day apart,
 * calculated from offsets around a given base.
 *
 * @param base - The reference Date
 * @param startOffset - The offset in number of days for the start of the range
 * @param endOffset - The offset in number of days for the end of the range
 * @returns An array of epoch timestamps
 */
export function createRelativeDailyTimestampRange(
  base: Date,
  startOffset: number,
  endOffset: number,
) {
  if (startOffset > endOffset) return [];

  const startDateRaw = base.getTime() + startOffset * ONE_DAY;
  const startDate = new Date(
    startDateRaw + getTzOffsetMsecs(new Date(startDateRaw), base),
  );

  const endDateRaw = base.getTime() + endOffset * ONE_DAY;
  const endDate = endDateRaw + getTzOffsetMsecs(new Date(endDateRaw), base);

  const timestampRange: number[] = [];
  let currentDate = startDate.getTime();
  while (currentDate <= endDate) {
    timestampRange.push(currentDate);
    const nextDate = currentDate + ONE_DAY;
    currentDate =
      nextDate - getTzOffsetMsecs(new Date(currentDate), new Date(nextDate));
  }
  return timestampRange;
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
  return Math.floor(diff / ONE_DAY);
}

export function getTzOffsetMsecs(previous: Date, current: Date) {
  return (
    (previous.getTimezoneOffset() - current.getTimezoneOffset()) * 60 * 1000
  );
}

/**
 * Converts a date string in the format `year dayOfYear` to an epoch timestamp.
 *
 * @param yearDay - A string in the format `year dayOfyear`
 * @returns An epoch timestamp, or null if the input string wasn't formatted correctly
 */
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
