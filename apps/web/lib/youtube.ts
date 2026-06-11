/**
 * Utility service to resolve YouTube Channel ID and details from a given YouTube Video ID.
 * Features a dual-mode resolver:
 * 1. Uses the official YouTube Data API v3 if a valid Google Cloud API key is configured.
 * 2. Falls back to a zero-auth HTML parser scraper to extract meta tags, ensuring 100% runtime success.
 */
export async function resolveChannelFromVideo(videoId: string): Promise<{ channelId: string; channelTitle: string; videoTitle: string } | null> {
  try {
    if (!videoId || videoId.length !== 11) {
      return null;
    }

    // ── Method 1: Official YouTube Data API v3 ──
    const apiKey = process.env.GOOGLE_SHEET_API_KEY;
    if (apiKey && apiKey.startsWith("AIzaSy")) {
      try {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const item = data.items?.[0];
          if (item) {
            return {
              channelId: item.snippet.channelId,
              channelTitle: item.snippet.channelTitle,
              videoTitle: item.snippet.title
            };
          }
        }
      } catch (apiError) {
        console.error("[YOUTUBE_RESOLVER] YouTube Data API v3 failed, trying scraper fallback:", apiError);
      }
    }

    // ── Method 2: Zero-Auth Scraper Fallback ──
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(watchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });

    if (!response.ok) return null;
    const html = await response.text();

    // 1. Extract Channel ID (starting with UC)
    // Try itemprop tag first (most stable)
    let channelIdMatch = html.match(/itemprop="channelId"\s+content="(UC[A-Za-z0-9_-]{22})"/);
    let channelId = channelIdMatch ? channelIdMatch[1] : null;

    if (!channelId) {
      // Try JSON structure in page source
      const jsonMatch = html.match(/"channelId"\s*:\s*"(UC[A-Za-z0-9_-]{22})"/);
      channelId = jsonMatch ? jsonMatch[1] : null;
    }

    if (!channelId) {
      // Try channel link tag
      const linkMatch = html.match(/<link\s+itemprop="url"\s+href="[^"]*youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})"/);
      channelId = linkMatch ? linkMatch[1] : null;
    }

    if (!channelId) {
      console.warn(`[YOUTUBE_RESOLVER] Could not extract channelId for video: ${videoId}`);
      return null;
    }

    // 2. Extract Video Title
    const titleMatch = html.match(/<meta\s+name="title"\s+content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
    const videoTitle = titleMatch ? titleMatch[1].replace(" - YouTube", "").trim() : "Video YouTube";

    // 3. Extract Channel Title
    const nameMatch = html.match(/<link\s+itemprop="name"\s+content="([^"]+)"/i);
    let channelTitle = nameMatch ? nameMatch[1].trim() : "";

    if (!channelTitle) {
      const authorMatch = html.match(/"author"\s*:\s*"([^"]+)"/);
      channelTitle = authorMatch ? authorMatch[1].trim() : "Kênh YouTube";
    }

    return {
      channelId,
      channelTitle,
      videoTitle
    };
  } catch (error) {
    console.error(`[YOUTUBE_RESOLVER] Error resolving video ${videoId}:`, error);
    return null;
  }
}
