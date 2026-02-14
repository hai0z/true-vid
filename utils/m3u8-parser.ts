// Parse m3u8 playlist and extract video segments

export interface M3U8Segment {
  duration: number;
  url: string;
}

export interface M3U8Playlist {
  segments: M3U8Segment[];
  targetDuration: number;
  version: number;
}

export function parseM3U8(content: string, baseUrl: string): M3U8Playlist {
  const lines = content.split('\n').filter(line => line.trim());
  const segments: M3U8Segment[] = [];
  let targetDuration = 0;
  let version = 3;
  let currentDuration = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Parse version
    if (line.startsWith('#EXT-X-VERSION:')) {
      version = parseInt(line.split(':')[1]);
    }

    // Parse target duration
    if (line.startsWith('#EXT-X-TARGETDURATION:')) {
      targetDuration = parseInt(line.split(':')[1]);
    }

    // Parse segment duration
    if (line.startsWith('#EXTINF:')) {
      const match = line.match(/#EXTINF:([\d.]+),/);
      if (match) {
        currentDuration = parseFloat(match[1]);
      }
    }

    // Parse segment URL
    if (!line.startsWith('#') && line.length > 0) {
      const segmentUrl = line.startsWith('http') 
        ? line 
        : new URL(line, baseUrl).toString();
      
      segments.push({
        duration: currentDuration,
        url: segmentUrl,
      });
      currentDuration = 0;
    }
  }

  return {
    segments,
    targetDuration,
    version,
  };
}

export async function fetchM3U8Playlist(m3u8Url: string): Promise<M3U8Playlist | null> {
  try {
    console.log('🎬 Fetching m3u8:', m3u8Url);
    
    const response = await fetch(m3u8Url);
    if (!response.ok) {
      console.log('❌ M3U8 fetch failed:', response.status);
      return null;
    }

    const content = await response.text();
    console.log('📺 M3U8 Content Length:', content.length);
    console.log('📺 M3U8 Content (first 500 chars):', content.substring(0, 500));
    console.log('📺 M3U8 Full Content:', content);
    
    const playlist = parseM3U8(content, m3u8Url);
    console.log('✅ Parsed playlist:', {
      segments: playlist.segments.length,
      targetDuration: playlist.targetDuration,
      firstSegment: playlist.segments[0]?.url,
    });
    
    return playlist;
  } catch (error) {
    console.log('❌ Error fetching m3u8:', error);
    return null;
  }
}
