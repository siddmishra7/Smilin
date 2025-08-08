import React from 'react';
import ChatPageClient from '../ChatPageClient';

export default function Page({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const resolvedParams = React.use(params);
  return <ChatPageClient peerUsername={resolvedParams.username} />;
}
