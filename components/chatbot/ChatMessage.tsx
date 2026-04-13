import React from 'react';
import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMsgType } from '@/types';

export function ChatMessage({ message }: { message: ChatMsgType }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap',
          isUser
            ? 'bg-indigo-600 text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
        )}
      >
        {message.content}
      </div>
    </div>
  );
}
