// index.js

// 1) 환경 변수
import 'dotenv/config';

// 2) 외부 라이브러리
import express from 'express';
import session from 'express-session';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import YAML from 'yaml';
import path from 'path';
import { fileURLToPath } from 'url';

// 3) 내부 공용 모듈
import logger from './common/logger.js';
import { ERR, AppError } from './common/error.js';
import { uploadAppError } from './middleware/upload.js';
import { sessionUser, requireAuth, requireAdmin } from './middleware/auth.js';

// 4) 라우터
import adminRouter from './routes/adminRouter.js';
import authRouter from './routes/authRouter.js';
import restaurantRouter from './routes/restaurantRouter.js';
import reviewRouter from './routes/reviewRouter.js';
import userRouter from './routes/userRouter.js';
import meRouter from './routes/meRouter.js';
import inquiryRouter from './routes/inquiryRouter.js';
import crawlerRouter from './routes/crawlerRouter.js';
import tagRouter from './routes/tagRouter.js';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

const app = express();
app.set('trust proxy', true); // HTTP → HTTPS

// 5) 보안/공통 미들웨어
app.use(helmet());
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(
        new AppError(ERR.FORBIDDEN, {
          logMessage: 'CORS origin이 허용되지 않습니다.',
          data: { origin },
        }),
      );
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  }),
);
app.use(compression());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// 6) 세션 쿠키
const isProd = process.env.NODE_ENV === 'production';
app.use(
  session({
    name: process.env.SESSION_COOKIE_NAME || 'sid',
    secret: process.env.SESSION_SECRET || 'dev-session-secret',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd, // HTTPS에서만 true
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7일
    },
  }),
);

// 7) 정적 파일
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/upload', express.static(path.join(__dirname, 'upload')));

// 8) 라우터 연결
app.use('/tags', tagRouter);
app.use('/restaurants', sessionUser, restaurantRouter);
app.use('/reviews', sessionUser, requireAuth, reviewRouter);
app.use('/inquiries', inquiryRouter);
app.use('/users', userRouter);
app.use('/auth', authRouter);
app.use('/me', sessionUser, requireAuth, meRouter);
app.use('/admin', sessionUser, requireAuth, requireAdmin, adminRouter);
app.use('/crawler', crawlerRouter); // 추후 admin 라우터 밑으로 옮길 예정

// 9) Swagger
import { mountDocs } from './docs/mountDocs.js';
mountDocs(app);

// 10) 404 처리 미들웨어
app.use((req, res, next) => {
  next(new AppError(ERR.NOT_FOUND));
});

// 11) 공통 에러 처리 미들웨어
app.use((err, req, res, next) => {
  // 1) multer / upload 에러 변환
  if (!(err instanceof AppError)) err = uploadAppError(err);

  // 2) 완전 미정의 에러 → INTERNAL
  if (!(err instanceof AppError)) err = new AppError(ERR.INTERNAL, { cause: err });

  // 3) 로깅
  const payload = { err, method: req.method, path: req.originalUrl ?? req.path };
  if (err.logLevel === 'WARN') logger.warn(payload);
  else logger.error(payload);

  res.status(err.status).json({
    success: false,
    code: err.code,
    message: err.expose ? err.message : ERR.INTERNAL.message,
  });
});

// 12) 서버 시작
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  logger.info({
    code: 'SERVER_START',
    message: `Server started on port ${PORT}`,
  });
});
