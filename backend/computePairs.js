import { parse } from 'csv-parse';
import { parse as parseDate, isValid } from 'date-fns';

// Supported date formats to handle multiple input scenarios
const DATE_FORMATS = [
  'yyyy-MM-dd',
  'dd/MM/yyyy',
  'MM/dd/yyyy',
  'd-MMM-yyyy',
  'd MMM yyyy',
  'yyyy/MM/dd',
  'MM-dd-yyyy',
  'MMM d, yyyy',
  'MMMM d, yyyy',
  'd MMMM yyyy',
  'yyyy.MM.dd',
  'dd.MM.yyyy',
  'MM/dd/yyyy HH:mm',
  'yyyy-MM-dd HH:mm'
];

// Number of milliseconds in a day (used for date difference calculations)
const DAY_MS = 1000 * 60 * 60 * 24;

function toDate(value, today = new Date()) {
    // If date is null - put it as today's date
    if (!value || value.trim().toUpperCase() === 'NULL'){
        return today;
    }

    for (const format of DATE_FORMATS) {
        const date = parseDate(value.trim(), format, new Date());
        if (isValid(date)){
            return date;
        }
    }

    const date = new Date(value);
    if (isValid(date)){
        return date;
    }

    // throw error if the date is badly formatted
    throw new Error(`Bad date: "${value}"`);
}

function getOverlapDays(fromA, toA, fromB, toB) {
  const start = fromA > fromB ? fromA : fromB;
  const end = toA < toB ? toA : toB;
  return Math.max(0, Math.round((end - start) / DAY_MS) + 1);
}

/**
 * Main function to compute pairs using the sweep-line approach.
 */
export function computePairs(stream, today = new Date()) {
  return new Promise((resolve) => {
    const projects = new Map();
    const errors = [];

    let done = false;
    const finish = (payload) => {
      if (!done) {
        done = true;
        resolve(payload);
      }
    };

    const handleError = (err) => {
      errors.push({
        message: `Stream error: ${err.message}`,
        type: 'stream_error',
        record: null,
      });
      finish({ pairs: [], top: null, errors });
    };
    stream.once('error', handleError);

    
    // Read the CSV data
    stream
      .pipe(parse({ trim: true, skip_empty_lines: true, comment: '#' }))
      .on('data', (row) => {
        // Check if the row has at least 4 columns, else classify as malformed
        if (!Array.isArray(row) || row.length < 4) {
          errors.push({
            message: `Malformed row: ${JSON.stringify(row)}`,
            type: 'malformed_row',
            record: row
          });
          return;
        }

        const [employee, project, dateFrom, dateTo] = row;

        try {
          // Convert the line into a structured record
          const record = { emp: +employee, from: toDate(dateFrom, today), to: toDate(dateTo, today) };

          if (!projects.has(project)) projects.set(project, []);

          // Add employee record to the respective project
          projects.get(project).push(record);
        } catch (err) {
          // Collect bad records but continue processing
          errors.push({
            message: `Error in record [${employee}, ${project}, ${dateFrom}, ${dateTo}]: ${err.message}`,
            type: err.message.startsWith('Bad date:') ? 'BadDate' : 'parse_error',
            record: [employee, project, dateFrom, dateTo]
          });
        }
      })
      .on('end', () => {
        // Handle explicitly the case of empty or invalid CSV input
        if (projects.size === 0) {
          resolve({ pairs: [], top: null, errors });
          return;
        }

        // Map to store unique employee pairs and their overlapping details
        const pairsMap = new Map();

        // Process each project
        for (const [project, records] of projects) {
          // Step 1: Sort employees by their 'from' date (ascending)
          records.sort((a, b) => a.from - b.from);

          const active = new Map();

          // Step 2: Iterate over sorted employees
          for (const current of records) {
            // Remove employees whose 'to' date is before current 'from' date
            for (const [empId, emp] of active) {
              if (emp.to < current.from) {
                active.delete(empId);
              }
            }

            // Compare only with currently active employees (who still overlap with current)
            for (const emp of active.values()) {
              const days = getOverlapDays(current.from, current.to, emp.from, emp.to);

              if (days > 0) {
                // Generate a unique key for the pair (regardless of order)
                const key = [current.emp, emp.emp].sort().join('-');

                // If not exists, initialize the pair entry
                if (!pairsMap.has(key)) {
                  pairsMap.set(key, { empA: current.emp, empB: emp.emp, projects: [] });
                }

                // Record the project and overlapping days
                pairsMap.get(key).projects.push({ project, days });
              }
            }

            // Add current employee to active list (Map by emp ID)
            active.set(current.emp, current);
          }
        }

        // Calculate total overlapping days per pair and flatten the data
        const pairs = [...pairsMap.values()].map(pair => ({
          ...pair,
          totalDays: pair.projects.reduce((acc, p) => acc + p.days, 0)
        }));

        // Sort pairs by total overlapping days descending
        pairs.sort((a, b) => b.totalDays - a.totalDays);

        // Select the top pair with the highest overlapping days (if exists)
        const top = pairs[0] ?? null;

        resolve({ pairs, top, errors });
      })
      .on('error', (err) => {
        errors.push({
          message: `Stream error: ${err.message}`,
          type: 'stream_error',
          record: null
        });
        resolve({ pairs: [], top: null, errors });
      });
  });
}

