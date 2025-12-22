// server/middleware/upload.js
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { AppError, ERR } from '../common/error.js';

const MB = 1024 * 1024;
const LIMITS = {
    fileSize: 10 * MB,
    reviewPhotos: 5,
    inquiryPhotos: 3,
};
const IMG_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
const UPLOAD_ROOT = path.resolve(process.cwd(), 'upload');


const ensureDir = (dir) => (fs.mkdirSync(dir, { recursive: true }), dir);
const extOf = (name) => path.extname(String(name || '')).toLowerCase();
const rand8 = () => Math.random().toString(16).slice(2, 10);
const idFrom = (req, keys) => {
    for (const k of keys) {
        const v = k.split('.').reduce((o, kk) => (o ? o[kk] : undefined), req);
        if (v != null && String(v).trim() !== '') return String(v);
    }
    return '0';
};


function imageOnlyFilter(req, file, cb) {
    const ext = extOf(file?.originalname);
    if (IMG_EXTS.includes(ext)) return cb(null, true);
    return cb(Object.assign(new Error('ONLY_IMAGE_ALLOWED'), { code: 'ONLY_IMAGE_ALLOWED' }));
}

/** 커스텀 업로더
 * @param {{
 *   subdir: string,
 *   filename: (req:any, file:any, ext:string, original:string) => string,
 *   limits?: { fileSize?: number, files?: number },
 *   filter?: (req:any, file:any, cb:(err:any, ok?:boolean)=>void) => void
 * }} opt
 */
export function makeUploader(opt) {
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            const dir = ensureDir(path.join(UPLOAD_ROOT, opt.subdir));
            cb(null, dir);
        },
        filename: (req, file, cb) => {
            const original = Buffer.from(file?.originalname ?? '', 'latin1')
                .toString('utf8')
                .normalize('NFC');

            const ext = extOf(original) || '.jpg';
            cb(null, opt.filename(req, file, ext, original));
        },
    });

    const limits = {};
    if (opt?.limits?.fileSize != null) limits.fileSize = opt.limits.fileSize;
    if (opt?.limits?.files != null) limits.files = opt.limits.files;

    return multer({
        storage,
        fileFilter: opt.filter ?? imageOnlyFilter,
        limits,
    });
}

export const uploaders = {
    // upload/profiles/{user_id}-{ts}.{ext}
    profile: makeUploader({
            subdir: 'profiles',
            limits: { fileSize: LIMITS.fileSize, files: 1 },
            filter: imageOnlyFilter,
            filename: (req, file, ext) => {
                const userId = idFrom(req, ['user.user_id', 'user.id', 'params.id', 'body.user_id']);
                return `${userId}-${Date.now()}-${rand8()}${ext}`;
            },
        }).single('profile'),

    // upload/reviews/{review_id}-{rand}.{ext}
    review: makeUploader({
            subdir: 'reviews',
            limits: { fileSize: LIMITS.fileSize, files: LIMITS.reviewPhotos },
            filter: imageOnlyFilter,
            filename: (req, file, ext) => {
                const reviewId = idFrom(req, ['params.review_id', 'params.id', 'body.review_id', 'body.id']);
                return `${reviewId}-${rand8()}${ext}`;
            },
        }).array('photos'),

    // upload/inquiries/{inquiry_id}-{rand}.{ext}
    inquiry: makeUploader({
            subdir: 'inquiries',
            limits: { fileSize: LIMITS.fileSize, files: LIMITS.inquiryPhotos },
            filter: imageOnlyFilter,
            filename: (req, file, ext) => {
                const inquiryId = idFrom(req, ['params.id', 'params.inquiry_id', 'params.inquiryId', 'body.inquiry_id', 'body.id']);
                return `${inquiryId}-${rand8()}${ext}`;
            },
        }).array('photos'),

    // upload/restaurants/{restaurant_id}-{ts}-{rand}.{ext}
    restaurant: makeUploader({
        subdir: 'restaurants',
        limits: { fileSize: LIMITS.fileSize },
        filter: imageOnlyFilter,
        filename: (req, file, ext) => {
            const restaurantId = idFrom(req, ['params.id', 'params.restaurant_id', 'params.restaurantId', 'body.restaurant_id']);
            const field = String(file?.fieldname ?? 'photo');
            return `${restaurantId}-${field}-${Date.now()}-${rand8()}${ext}`;
        },
        }).fields([
            { name: 'main' },
            { name: 'menu_board' },
            { name: 'etc' },
        ]),
}


/** file → file_path */
export function toFilePath(file) {
    if (!file) return null;
    const folder = path.basename(file.destination);
    return `/upload/${folder}/${file.filename}`;
}

/** multer 에러 핸들러 */
export function uploadAppError(err) {

    // Multer 에러
    if (err instanceof multer.MulterError) {
        const data = {
            keys: ['upload'],
            extra: { uploader: 'multer', code: err.code, field: err.field ?? null },
        };

        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                return new AppError(ERR.BAD_REQUEST, {
                    message: '파일 크기가 제한을 초과했습니다. (10MB)',
                    data,
                    cause: err,
                });
            case 'LIMIT_FILE_COUNT':
                return new AppError(ERR.BAD_REQUEST, {
                    message: '업로드 가능한 파일 개수 제한을 초과했습니다.',
                    data,
                    cause: err,
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return new AppError(ERR.BAD_REQUEST, {
                    message: '허용되지 않은 파일 필드입니다.',
                    data,
                    cause: err,
                });
            default:
                return new AppError(ERR.BAD_REQUEST, {
                    message: '파일 업로드 요청이 올바르지 않습니다.',
                    data,
                    cause: err,
                });
        }
    }

    // Filefilter 에러
    if (err && (err.code === 'ONLY_IMAGE_ALLOWED' || err.message === 'ONLY_IMAGE_ALLOWED'))
        return new AppError(ERR.BAD_REQUEST, {
            message: `이미지 파일만 업로드할 수 있습니다. (${IMG_EXTS.map((x) => x.replace('.', '')).join('/')})`,
            data: {
                extra: { code: 'ONLY_IMAGE_ALLOWED' },
            },
            cause: err,
        });

    // 디스크/권한/쓰기 에러
    return err;
}
