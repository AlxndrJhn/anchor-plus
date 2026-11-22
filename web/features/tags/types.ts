export interface Tag {
  id: string;
  name: string;
  color?: string;
  /** Where it was dragged among the tags; unplaced ones come after, by name. */
  position?: number | null;
  version: number;
  updatedAt?: string;
  _count?: {
    notes: number;
  };
}

export type TagLabel = Pick<Tag, "id" | "name" | "color" | "position">;

export interface CreateTagDto {
  name: string;
  color?: string;
}

export interface UpdateTagDto {
  name?: string;
  color?: string;
  baseVersion?: number;
}
