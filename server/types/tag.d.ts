// types/tag.d.ts

import { TagType } from './enum';

declare global {
  namespace tag {
    // ======= Controller → Service ==========

    type CreatePayload = {};

    type UpdatePayload = {};

    // ========== Service → Controller =======

    type Item = {
      name: string;
      code: string;
      clickCount: number;
      usageCount: number;
      depth: 1;
    };

    type FoodTagNode = Base & {
      depth: 1 | 2;
      children?: FoodTagNode[];
    };

    type TagList = {
      items: Item[];
      total: number;
    };

    type FoodTagList = {
      items: FoodTagNode;
      total: number;
    };
  }
}
