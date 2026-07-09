import { useState, useEffect } from 'react';

export interface WikipediaSummary {
  title: string;
  extract: string;
  thumbnailUrl?: string;
  pageUrl?: string;
  isLoading: boolean;
  error: string | null;
}

/**
 * Premium custom hook that fetches the introductory paragraph and media assets
 * from the official, public Wikipedia API for any landmark or location title.
 * 
 * @param title The name/title of the landmark to search for.
 * @returns An object containing the loaded summary, loading state, and potential errors.
 */
export function useWikipediaSync(title: string | null): WikipediaSummary {
  const [summary, setSummary] = useState<WikipediaSummary>({
    title: title || '',
    extract: '',
    isLoading: false,
    error: null
  });

  useEffect(() => {
    if (!title) {
      setSummary({
        title: '',
        extract: 'Select a landmark to synchronize details from Wikipedia.',
        isLoading: false,
        error: null
      });
      return;
    }

    let isMounted = true;
    setSummary(prev => ({ ...prev, isLoading: true, error: null }));

    const fetchWikipediaSummary = async () => {
      try {
        // Clean up title for optimal Wikipedia lookup
        // E.g., "City Palace, Jaipur" becomes "City Palace, Jaipur" or just "City Palace"
        // We will try to search for the full title, and fall back to the first segment if there is a comma.
        const cleanTitle = title.trim();
        const firstSegment = title.split(',')[0].trim();
        
        let response = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTitle)}`
        );

        // If the full title doesn't match, attempt fallback with the first segment
        if (!response.ok && firstSegment !== cleanTitle) {
          response = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstSegment)}`
          );
        }

        if (!response.ok) {
          throw new Error(`Wikipedia reported a status code of ${response.status}`);
        }

        const data = await response.json();

        if (isMounted) {
          if (data.type === 'no-title' || !data.extract) {
            setSummary({
              title: cleanTitle,
              extract: 'Wikipedia page found, but no summary introduction is available.',
              isLoading: false,
              error: null
            });
          } else {
            setSummary({
              title: data.title || cleanTitle,
              extract: data.extract,
              thumbnailUrl: data.thumbnail?.source,
              pageUrl: data.content_urls?.desktop?.page,
              isLoading: false,
              error: null
            });
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn(`[Wikipedia Sync Warning] Failed lookup for "${title}":`, err.message || err);
          setSummary({
            title,
            extract: `Wikipedia record lookup is offline or unavailable. Showing local telemetry backup description.`,
            isLoading: false,
            error: err.message || 'Wikipedia Sync Offline'
          });
        }
      }
    };

    // Debounce slightly to prevent double-firing on rapid tour transitions
    const timer = setTimeout(() => {
      fetchWikipediaSummary();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [title]);

  return summary;
}
