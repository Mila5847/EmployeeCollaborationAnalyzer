import fs from 'fs';
import { computePairs } from '../computePairs.js';

const stream = fs.createReadStream('test_10records.csv');

computePairs(stream)
  .then(({ top, rows }) => {
    console.log('Top pair:', top);
    console.log('All pairs per project:');
    console.table(rows);
  })
  .catch(err => console.error('Error:', err.message));
