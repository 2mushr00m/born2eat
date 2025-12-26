// types/enum.d.ts

export type RestaurantDataStatus = 'RAW' | 'BASIC' | 'VERIFIED';
export type RestaurantPhotoType = 'MAIN' | 'MENU_BOARD' | 'ETC';
export type RestaurantPhotoSource = 'USER' | 'ADMIN' | 'CRAWLER';
export type BroadcastOtt = 'NETFLIX' | 'TVING' | 'WAVVE' | 'ETC';

export type InquiryType = 'GENERAL' | 'BUG' | 'RESTAURANT' | 'ACCOUNT' | 'OTHER';
export type InquiryStatus = 'PENDING' | 'ANSWERED';
export type InquirySearchTarget = 'ALL' | 'CONTENT' | 'TITLE';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';
export type UserRole = 'ADMIN' | 'USER';

export type TagType = 'food' | 'tag';

export type ReivewSort = 'recent' | 'like' | 'rating';
export type ReviewSearchTarget = 'ALL' | 'RESTAURANT' | 'USER';
