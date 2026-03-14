export type PieceType = 'master' | 'v' | 'h' | 's';

export interface Piece {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: PieceType;
}
