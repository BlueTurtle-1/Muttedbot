import play from '@iamtraction/play-dl';

export async function searchTrack(query, requestedBy) {
  const results = await play.search(query, { limit: 1, source: { youtube: 'video' } });
  if (!results || results.length === 0) return null;

  const video = results[0];
  return {
    title: video.title,
    url: video.url,
    duration: video.durationRaw,
    requestedBy,
  };
}