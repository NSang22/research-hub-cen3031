import { StreamChat } from 'stream-chat';

// Singleton Stream Chat client initialized with the Vite env variable
const streamChatClient = StreamChat.getInstance(
  import.meta.env.VITE_STREAM_API_KEY as string
);

export default streamChatClient;

/** Connect (or re-connect) a user to Stream Chat. */
export async function connectUser(
  userId: string,
  token: string,
  name: string,
  role: string
): Promise<void> {
  // If already connected as this user, skip
  if (streamChatClient.userID === userId) return;
  // Disconnect any previous user first
  if (streamChatClient.userID) {
    await streamChatClient.disconnectUser();
  }
  await streamChatClient.connectUser({ id: userId, name, role }, token);
}

/** Disconnect the current user from Stream Chat. */
export async function disconnectUser(): Promise<void> {
  if (streamChatClient.userID) {
    await streamChatClient.disconnectUser();
  }
}
