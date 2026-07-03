#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { writeCandidateIndex } from './lib/candidate-index.mjs';

const parsed = parseArgs({
  options: {
    'candidate-report': { type: 'string', multiple: true },
  },
});

try {
  const index = await writeCandidateIndex(process.cwd(), parsed.values['candidate-report'] || []);
  console.log(`Candidate index written: ${index.candidates.length} candidates from ${index.reports.length} report slots`);
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
