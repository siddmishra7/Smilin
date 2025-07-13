import React from 'react';
import ChatPageClient from '../ChatPageClient';

export default function Page({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const resolvedParams = React.use(params);
  return <ChatPageClient peerId={resolvedParams.userId} />;
}
