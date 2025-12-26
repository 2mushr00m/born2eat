// common/constants.js

export const RESTAURANT_DATA_STATUS = /** @type {const} */ ({
  RAW: 'RAW',
  BASIC: 'BASIC',
  VERIFIED: 'VERIFIED',
});
export const RESTAURANT_PHOTO_TYPE = /** @type {const} */ ({
  MAIN: 'MAIN',
  MENU_BOARD: 'MENU_BOARD',
  ETC: 'ETC',
});
export const RESTAURANT_PHOTO_SOURCE = /** @type {const} */ ({
  USER: 'USER',
  ADMIN: 'ADMIN',
  CRAWLER: 'CRAWLER',
});

export const BROADCAST_OTT = /** @type {const} */ ({
  NETFLIX: 'NETFLIX',
  TVING: 'TVING',
  WAVVE: 'WAVVE',
  ETC: 'ETC',
});

export const INQUIRY_TYPE = /** @type {const} */ ({
  GENERAL: 'GENERAL',
  BUG: 'BUG',
  RESTAURANT: 'RESTAURANT',
  ACCOUNT: 'ACCOUNT',
  OTHER: 'OTHER',
});
export const INQUIRY_STATUS = /** @type {const} */ ({
  PENDING: 'PENDING',
  ANSWERED: 'ANSWERED',
});
export const INQUIRY_SEARCH_TARGET = /** @type {const} */ ({
  ALL: 'ALL',
  TITLE: 'TITLE',
  CONTENT: 'CONTENT',
});

export const USER_STATUS = /** @type {const} */ ({
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  BANNED: 'BANNED',
  DELETED: 'DELETED',
});
export const USER_ROLE = /** @type {const} */ ({
  ADMIN: 'ADMIN',
  USER: 'USER',
});

export const TAG_TYPE = /** @type {const} */ ({
  food: 'food',
  tag: 'tag',
});

export const CRAWL_STATUS = /** @type {const} */ ({
  SKIP: 'SKIP',
  SUCCESS: 'SUCCESS',
});
