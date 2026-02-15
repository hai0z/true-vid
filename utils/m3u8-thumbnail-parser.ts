// Parse m3u8 thumbnail playlist
export interface ThumbnailSegment {
  duration: number;
  url: string;
  startTime: number;
  endTime: number;
}

export function parseM3U8Thumbnails(m3u8Content: string, m3u8Url: string): ThumbnailSegment[] {
  const lines = m3u8Content.split('\n').map(line => line.trim());
  const segments: ThumbnailSegment[] = [];
  let currentTime = 0;

  // Extract base URL (protocol + domain)
  const urlObj = new URL(m3u8Url);
  const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Parse #EXTINF line
    if (line.startsWith('#EXTINF:')) {
      const durationMatch = line.match(/#EXTINF:([\d.]+),/);
      if (durationMatch) {
        const duration = parseFloat(durationMatch[1]);
        
        // Next line should be the URL
        const nextLine = lines[i + 1];
        if (nextLine && !nextLine.startsWith('#')) {
          // Trim whitespace from path
          const cleanPath = nextLine.trim();
          
          // Build full URL
          let url: string;
          if (cleanPath.startsWith('http')) {
            url = cleanPath;
          } else if (cleanPath.startsWith('/')) {
            // Absolute path
            url = `${baseUrl}${cleanPath}`;
          } else {
            // Relative path
            const m3u8Dir = m3u8Url.substring(0, m3u8Url.lastIndexOf('/') + 1);
            url = `${m3u8Dir}${cleanPath}`;
          }
          
          // Remove all whitespace from final URL
          url = url.replace(/\s+/g, '');
          
          segments.push({
            duration,
            url,
            startTime: currentTime,
            endTime: currentTime + duration,
          });
          
          currentTime += duration;
        }
      }
    }
  }

  return segments;
}

export function getThumbnailForTime(segments: ThumbnailSegment[], time: number): string | null {
  const segment = segments.find(seg => time >= seg.startTime && time < seg.endTime);
  return segment?.url || null;
}
