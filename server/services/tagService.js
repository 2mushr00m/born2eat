// services/tagService.js
import db from '../repository/db.js';
import { AppError, ERR } from '../common/error.js';
import { TAG_TYPE } from '../common/constants.js';

/** food tree 구성 (PUBLIC)
 * @param {Array<{ code: string, name: string, path: string | null }>} rows
 * @returns {tag.FoodList}
 */
function buildFoodTree(rows) {
  /** @type {Map<string, tag.FoodNode>} */
  const nodesByPath = new Map();
  /** @type {tag.FoodList} */
  const roots = [];

  const sorted = [...rows].sort((a, b) => {
    const da = (a.path || '').split('/').filter(Boolean).length;
    const dbb = (b.path || '').split('/').filter(Boolean).length;
    if (da !== dbb) return da - dbb;
    return String(a.path || '').localeCompare(String(b.path || ''));
  });

  for (const r of sorted) {
    /** @type {tag.FoodNode} */
    const node = { code: String(r.code), name: String(r.name) };

    const path = (r.path || '').trim();
    if (path) nodesByPath.set(path, node);

    let parentPath = null;
    if (path) {
      const parts = path.split('/').filter(Boolean);
      if (parts.length >= 2) parentPath = parts.slice(0, -1).join('/');
    }

    if (parentPath && nodesByPath.has(parentPath)) {
      const parent = nodesByPath.get(parentPath);
      if (!parent.children) parent.children = [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/** 태그 목록 조회 (PUBLIC)
 * @param {{ type: 'tag' | 'food' }} filter
 * @returns {Promise<tag.TagList | tag.FoodList>}
 */
export async function readTagList(filter) {
  const type = filter?.type;

  const conn = await db.getConnection();

  try {
    const [rows] = await conn.execute(
      `
      SELECT
        t.code AS code,
        t.name AS name,
        t.path AS path
      FROM tag t
      WHERE t.type = :type
      ORDER BY
        t.click_count DESC,
        t.usage_count DESC,
        t.tag_id ASC
      `,
      { type },
    );

    const list = (rows || []).map((r) => ({
      code: String(r.code || ''),
      name: String(r.name || ''),
      path: r.path ?? null, // food 트리 구성에만 사용
    }));

    if (type === TAG_TYPE.tag) {
      /** @type {tag.TagList} */
      const items = list.map((x) => ({ code: x.code, name: x.name }));
      return items;
    }

    // type === 'food' → tree
    return buildFoodTree(list);
  } catch (err) {
    throw new AppError(ERR.DB, {
      message: '태그 목록 조회 중 오류가 발생했습니다.',
      data: { keys: ['type'], extra: { type }, dbCode: err?.code },
      cause: err,
    });
  } finally {
    conn.release();
  }
}

/** 태그 목록 조회 (ADMIN)
 * @param {any} filter
 * @returns {Promise<any>}
 */
export async function readAdminTagList(filter) {}

/** 태그 생성
 * @param {any} payload
 * @returns {Promise<number>}
 */
export async function createTag(payload) {}

/** 태그 수정
 * @param {number} tagId
 * @param {any} payload
 * @returns {Promise<any>}
 */
export async function updateTag(tagId, payload) {}

/** 태그 삭제
 * @param {number} tagId
 * @returns {Promise<void>}
 */
export async function deleteTag(tagId) {}
