const onlineUsers = new Set<string>();

export function addOnlineUser(userId: string) {
  onlineUsers.add(userId);
}

export function removeOnlineUser(userId: string) {
  onlineUsers.delete(userId);
}

export function getOnlineUsers(): string[] {
  return Array.from(onlineUsers);
}
