// types/tag.d.ts

import { TagType } from './enum';

declare global {
  namespace tag {
    // ======= Controller → Service ==========
    type CreatePayload = {};

    type UpdatePayload = {};

    // ========== Service → Controller =======

    type Base = { name: string; code: string };
    type FoodNode = Base & { children?: FoodNode[] };
    type AdminNode = Base & {
      tagId: number;
      type: TagType;
      clickCount: number;
      usageCount: number;
      children?: AdminNode[];
    };

    type TagList = Base[];
    type FoodList = FoodNode[];
    type AdminList = AdminNode[];
  }
}
