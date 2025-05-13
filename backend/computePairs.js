import { parse } from 'csv-parse';
import { parse as parseDate, isValid } from 'date-fns';

const DATE_FORMATS = [
  'yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy',
  'd-MMM-yyyy', 'd MMM yyyy', 'yyyy/MM/dd'
];
const DAY_MS = 1000 * 60 * 60 * 24;

function toDate(value, today = new Date()) {
  if (!value || value.trim().toUpperCase() === 'NULL') return today;
  for (const fmt of DATE_FORMATS) {
    const d = parseDate(value.trim(), fmt, new Date());
    if (isValid(d)) return d;
  }
  const d = new Date(value);
  if (isValid(d)) return d;
  throw new Error(`Bad date: "${value}"`);
}

const diffDays = (a, b) => Math.max(0, Math.round((b - a) / DAY_MS) + 1);

export function computePairs(stream, today = new Date()) {
  return new Promise((resolve, reject) => {
    const projects = new Map(); // ProjectID -> records[]

    stream
      .pipe(parse({ trim: true, skip_empty_lines: true, comment: '#' }))
      .on('data', ([emp, proj, from, to]) => {
        const rec = { emp: +emp, from: toDate(from, today), to: toDate(to, today) };
        (projects.get(proj) ?? projects.set(proj, []).get(proj)).push(rec);
      })
      .on('error', reject)
      .on('end', () => {
        const pairTotals = new Map(); // "a-b" -> {total, perProject}
        for (const [proj, recs] of projects) {
          recs.sort((x, y) => x.from - y.from);
          for (let i = 0; i < recs.length; i++) {
            const a = recs[i];
            for (let j = i + 1; j < recs.length; j++) {
              const b = recs[j];
              if (b.from > a.to) break;                       // no overlap possible
              const overlap = diffDays(
                a.from > b.from ? a.from : b.from,
                a.to   < b.to   ? a.to   : b.to
              );
              if (!overlap) continue;
              const key = a.emp < b.emp ? `${a.emp}-${b.emp}` : `${b.emp}-${a.emp}`;
              const entry = pairTotals.get(key) ?? { total: 0, perProject: new Map() };
              entry.total += overlap;
              entry.perProject.set(proj, (entry.perProject.get(proj) || 0) + overlap);
              pairTotals.set(key, entry);
            }
          }
        }

        let top = { empA: null, empB: null, totalDays: 0 }, rows = [];
        for (const [key, { total, perProject }] of pairTotals) {
          const [empA, empB] = key.split('-').map(Number);
          if (total > top.totalDays) top = { empA, empB, totalDays: total };
          for (const [proj, days] of perProject)
            rows.push({ empA, empB, proj, days });
        }
        resolve({ top, rows });
      });
  });
}