// types/error.d.ts

export {};

export type ErrType = {
  code: string;
  status: number;
  message: string;
  expose?: boolean;
  level?: 'WARN' | 'ERROR';
  stack?: boolean;
};
export type ErrData = {
  targetId?: string | number;
  keys?: string[];

  dbCode?: string;

  apiUrl?: string;
  apiStatus?: number;
  apiCode?: string;

  extra?: Record<string, unknown>;
};
