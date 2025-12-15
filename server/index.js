// server/index.js

// 1) 환경 변수
import 'dotenv/config';

// 2) 외부 라이브러리
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// 3) 내부 공용 모듈
import { BasicError, NotFoundError } from './common/error.js';
import logger from './common/logger.js';

// 4) 라우터
import adminRouter from './route/adminRouter.js';
import restaurantRouter from './route/restaurantRouter.js';
import reviewRouter from './route/reviewRouter.js';
import userRouter from './route/userRouter.js';
import meRouter from './route/meRouter.js';
import inquiryRouter from './route/inquiryRouter.js';
import crawlerRouter from './route/crawlerRouter.js';
import tagRouter from './route/tagRouter.js';

const app = express();

// 5) 보안/공통 미들웨어
app.use(helmet());
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization'],
    optionsSuccessStatus: 204,
}));
app.use(compression());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// 6) 정적 파일
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/upload', express.static(path.join(__dirname, 'upload')));

/*
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'upload/'),
    filename: (req, file, cb) => {
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8').normalize('NFC');
        const base = file.fieldname + '-' + Date.now();
        const ext = path.extname(file.originalname);
        cb(null, base + ext);
    }
});
const upload = multer({ storage });
const FileStore = sessionFileStore(session);
*/

// 7) 라우터 연결
app.use('/admin', adminRouter);
app.use('/restaurants', restaurantRouter);
app.use('/reviews', reviewRouter);
app.use('/tags', tagRouter);
app.use('/users', userRouter);
app.use('/me', meRouter);
app.use('/inquiries', inquiryRouter);
app.use('/crawler', crawlerRouter);

// 8) 404 처리 미들웨어
app.use((req, res, next) => {
    next(
        new NotFoundError('요청하신 경로를 찾을 수 없습니다.', {
            data: { method: req.method, path: req.path },
        }),
    );
});

// 9) 공통 에러 처리 미들웨어
app.use((err, req, res, next) => {
    let appErr = err;
    if (!(err instanceof BasicError)) {
        appErr = new BasicError('알 수 없는 서버 오류가 발생했습니다.', {
            code: 'INTERNAL_ERROR',
            status: 500,
            cause: err,
        });
    }

    const { status, code, message, location, data } = appErr;
    logger.error({code, message, location, data});

    res.status(status).json({
        success: false,
        code,
        message,
    });
});

// 10) 서버 시작
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    logger.log({
        code: 'SERVER_START',
        message: `Server started on port ${PORT}`,
    });
})