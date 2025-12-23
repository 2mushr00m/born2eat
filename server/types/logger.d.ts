// types/logger.d.ts

export {};

type InfoCode = 'INFO' | 'SERVER_START'; // 필요 시 계속 추가
type LogLevel = 'ERROR' | 'WARN' | 'DEBUG' | 'INFO' | 'LOG';
type LogData = {
  targetId?: string | number;
  keys?: string[];

  dbCode?: string;

  apiUrl?: string;
  apiStatus?: number;
  apiCode?: string;

  extra?: Record<string, unknown>;
};

export type InfoPayload = {
  code?: InfoCode;
  message: string;
};
export type DebugPayload = {
  code?: string; // default: 'DEBUG'
  message: string;
  data?: LogData;
};
export type ErrorPayload = {
  code?: string;
  message: string;
  data?: LogData;
  cause?: Error;
};
