export const HOME_ROUTE = '/(tabs)/community';

/** Translate web/legacy links into screens that actually exist in the app. */
export function resolveAppRoute(raw: string): string | null {
  try {
    const url = new URL(raw, 'wayfare://app');
    let path = url.pathname;
    if (url.protocol === 'wayfare:' && url.hostname && url.hostname !== 'app') {
      path = `/${url.hostname}${path}`;
    }
    path = path.replace(/^\/--\//, '/').replace(/^\/\(tabs\)/, '').replace(/\/$/, '') || '/';
    if (path === '/') return HOME_ROUTE;
    if (path === '/oauth') return `/oauth${url.search}${url.hash}`;
    const place = path.match(/^\/places\/(\d+)$/);
    if (place) return `/(tabs)/explore?placeId=${place[1]}`;
    const tab = ({ '/home': 'community', '/community': 'community', '/explore': 'explore', '/itineraries': 'itinerary', '/itinerary': 'itinerary', '/ai-planner': 'itinerary', '/profile': 'profile' } as Record<string, string>)[path];
    if (!tab) return null;
    return `/(tabs)/${tab}${url.search}`;
  } catch {
    return null;
  }
}
