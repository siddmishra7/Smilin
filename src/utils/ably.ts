import Ably from 'ably';

let ablyClient: Ably.Realtime | null = null;

export function getAblyClient(clientId: string) {
  if (!ablyClient) {
    const uniqueClientId = `${clientId}-${Math.random().toString(36).substring(2, 8)}`;

    ablyClient = new Ably.Realtime({
      key: process.env.NEXT_PUBLIC_ABLY_API_KEY!,
      clientId: uniqueClientId,
    });
  }
  return ablyClient;
}
