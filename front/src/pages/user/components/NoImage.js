import React from 'react';
import { ImageOff } from 'lucide-react';

export default function NoPhoto({ height = 120, borderRadius = 6 }) {
  return (
    <div
      aria-label="사진 없음"
      style={{
        width: '100%',
        height,
        background: '#f2f2f2',
        borderRadius,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <ImageOff size={28} style={{ opacity: 0.55 }} />
    </div>
  );
}
