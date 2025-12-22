// server/service/meService.js
import db from '../repository/db.js';
import { AppError, ERR } from '../common/error.js';
import { updateUser, deleteUser } from './userService.js';


function notImplemented(fn, data) {
    throw new AppError(ERR.NOT_IMPLEMENTED ?? ERR.INTERNAL, {
        logMessage: `${fn} 는 아직 구현되지 않았습니다.`,
        data,
    });
}

/** 현재 사용자 정보 (좋아요 정보 등?) */
export async function readMe(ctx) {
    // TODO:
    // - ctx.userId로 user 조회
    // - status(DELETED/BANNED) 처리 정책
    // - 반환 필드 정책(email 포함/제외 등)
    return notImplemented('meService.readMe', ctx);
}
/** 닉네임/프로필 사진 등 변경
 * @param {number} userId
 * @param {me.UpdatePayload} payload 
 * @returns {Promise<auth.User>}
 */
export async function updateMe(userId, payload) {
    return await updateUser(userId, payload);
}

/** 회원 탈퇴 
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function deleteMe(userId) {
    await deleteUser(userId);
}


/** 내가 문의한 문의 목록 조회 */
export async function readMyInquiries(ctx, q) {
    // TODO:
    // - 문의 테이블에서 user_id 기준 조회
    // - 페이지네이션(page/limit)
    return notImplemented('meService.listMyInquiries', { ...ctx, ...q });
}

/** 내가 좋아요한 가게 목록 조회 */
export async function readMyLikes(ctx, q) {
    // TODO:
    // - likes 조인으로 restaurant 목록 반환
    // - is_published=1 필터(공개만)
    // - 페이지네이션(page/limit)
    return notImplemented('meService.listMyLikes', { ...ctx, ...q });
}

/** 내가 남긴 리뷰 목록 조회 */
export async function readMyReviews(ctx, q) {
    // TODO:
    // - reviews에서 user_id 기준 조회
    // - “삭제된 가게” 표시 정책: restaurant이 soft delete면 이름/주소 스냅샷을 리뷰에 남기는지 등 결정 필요
    return notImplemented('meService.listMyReviews', { ...ctx, ...q });
}

/** 비밀번호 변경 */
export async function changePassword(ctx, payload) {
    // TODO:
    // - current_password 검증(bcrypt.compare)
    // - next_password 해시 후 업데이트(password_hash)
    // - 필요 시 모든 세션 무효화(선택)
    return notImplemented('meService.changePassword', { ...ctx, ...payload });
}