import { HOME_ROUTE, resolveAppRoute } from '@/src/utils/appRoutes';

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  // Root launches and callback URLs must not land on +not-found.
  return resolveAppRoute(path) || HOME_ROUTE;
}
