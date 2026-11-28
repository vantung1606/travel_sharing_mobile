import { DeviceEventEmitter } from 'react-native';

export type InAppShare = { kind: 'post' | 'place' | 'itinerary' | 'profile'; id: number; title: string };
export const SHARE_EVENT = 'wayfare_share_in_app';

export function shareInApp(item: InAppShare) {
  DeviceEventEmitter.emit(SHARE_EVENT, item);
}

export function shareMessage(item: InAppShare): string {
  const paths = { post: `community?postId=${item.id}`, place: `places/${item.id}`, itinerary: `itineraries?id=${item.id}`, profile: `profile?userId=${item.id}` };
  return `${item.title.trim()}\nwayfare://${paths[item.kind]}`;
}

export function readSharedLink(content: string): { title: string; url: string } | null {
  const match = content.match(/(?:^|\n)(wayfare:\/\/(?:places\/\d+|community\?postId=\d+|itineraries\?id=\d+|profile\?userId=\d+))$/);
  return match ? { title: content.slice(0, match.index).trim() || 'Nội dung được chia sẻ', url: match[1] } : null;
}
