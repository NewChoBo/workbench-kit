export interface ModalPosition {
  x: number;
  y: number;
}

export interface ModalSize {
  width: number;
  height: number;
}

export interface ModalBounds extends ModalPosition, ModalSize {}

export type ModalResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
