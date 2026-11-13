import { config } from '../config.js';

function normalizeSearchText(value) {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function isPlayBlacklisted(value) {
  const normalizedQuery = ` ${normalizeSearchText(value)} `;
  return config.playBlacklistWords.some((word) => {
    const normalizedWord = normalizeSearchText(word);
    return normalizedWord && normalizedQuery.includes(` ${normalizedWord} `);
  });
}