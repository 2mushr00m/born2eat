// services/reviewService.js
import db from '../repository/db.js';
import { AppError, ERR } from '../common/error.js';

/** ~
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function readReviewList(userId) {
  const conn = await db.getConnection();
  try {
  } catch (err) {
  } finally {
    conn.release();
  }
}

/** ~
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function createReview(userId) {
  const conn = await db.getConnection();
  try {
  } catch (err) {
  } finally {
    conn.release();
  }
}

/** ~
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function updateReview(userId) {
  const conn = await db.getConnection();
  try {
  } catch (err) {
  } finally {
    conn.release();
  }
}

/** ~
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function deleteReview(userId) {
  const conn = await db.getConnection();
  try {
  } catch (err) {
  } finally {
    conn.release();
  }
}

/** ~
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function hideReview(userId) {
  const conn = await db.getConnection();
  try {
  } catch (err) {
  } finally {
    conn.release();
  }
}
