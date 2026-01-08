import React from 'react';
import { ImageOff, Camera } from 'lucide-react';

export default function NoPhoto({ mode = 'default', height = '100%', borderRadius = 6 }) {
  const isSuggestion = mode === 'suggestion';
  const clickable = typeof onClick === 'function';

  const label = isSuggestion ? '사진 제보하기' : '사진 없음';
  const Icon = isSuggestion ? Camera : ImageOff;
  const text = isSuggestion ? '사진 제보하기' : null;

  return (
    <div
      aria-label={label}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      style={{
        width: '100%',
        height,
        background: '#f2f2f2',
        borderRadius,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: clickable ? 'pointer' : 'default',
      }}>
      <Icon size={28} style={{ opacity: 0.35 }} />
      {text && <span style={{ fontSize: 12, opacity: 0.55 }}>{text}</span>}
    </div>
  );
}
