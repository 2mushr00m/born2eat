// index.js

// 1) 환경 변수
import 'dotenv/config';

// 2) 외부 라이브러리
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';

// 3) 내부 공용 모듈
import logger from './common/logger.js';
import { ERR, AppError } from './common/error.js';
import { uploadAppError } from './middleware/upload.js';
import { sessionUser, requireAuth, requireAdmin } from './middleware/auth.js';

// 4) 라우터
import adminRouter from './route/adminRouter.js';
import authRouter from './route/authRouter.js';
import restaurantRouter from './route/restaurantRouter.js';
import reviewRouter from './route/reviewRouter.js';
import userRouter from './route/userRouter.js';
import meRouter from './route/meRouter.js';
import inquiryRouter from './route/inquiryRouter.js';
import crawlerRouter from './route/crawlerRouter.js';
import tagRouter from './route/tagRouter.js';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const app = express();
app.set('trust proxy', true); // HTTP → HTTPS


// 5) 보안/공통 미들웨어
app.use(helmet());
app.use(cors({
    origin(origin, cb) {
        if (!origin) return cb(null, true);
        if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
        return cb(new AppError(ERR.FORBIDDEN, {
            logMessage: 'CORS origin이 허용되지 않습니다.',
            data: { origin },
        }));
    },
    credentials: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization'],
    optionsSuccessStatus: 204,
}));
app.use(compression());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// 6) 세션
const isProd = process.env.NODE_ENV === 'production';
app.use(session({
    name: process.env.SESSION_COOKIE_NAME || 'sid',
    secret: process.env.SESSION_SECRET || 'dev-session-secret',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProd, // HTTPS에서만 true
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7일
    },
}));

// 7) 쿠키

// 8) 정적 파일
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/upload', express.static(path.join(__dirname, 'upload')));

// 9) 라우터 연결
app.use('/admin', sessionUser, requireAuth, requireAdmin, adminRouter);
app.use('/auth', authRouter);
app.use('/restaurants', restaurantRouter);
app.use('/reviews', reviewRouter);
app.use('/tags', tagRouter);
app.use('/users', userRouter);
app.use('/me', sessionUser, requireAuth, meRouter);
app.use('/inquiries', sessionUser, requireAuth, inquiryRouter);
app.use('/crawler', crawlerRouter);

// 10) 404 처리 미들웨어
app.use((req, res, next) => {
    next(new AppError(ERR.NOT_FOUND));
});

// 11) 공통 에러 처리 미들웨어
app.use((err, req, res, next) => {
    
    // 1) multer / upload 에러 변환
    if (!(err instanceof AppError))
        err = uploadAppError(err);

    // 2) 완전 미정의 에러 → INTERNAL
    if (!(err instanceof AppError))
        err = new AppError(ERR.INTERNAL, { cause: err });
        
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
})
