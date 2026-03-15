export type PieceType = 'master' | 'v' | 'h' | 's';

export const BOARD_W = 4;
export const BOARD_H = 5;

export interface Piece {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: PieceType;
}
