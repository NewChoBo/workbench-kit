export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface GridLayoutSpec {
  readonly columns: number;
  readonly rows?: number | undefined;
  readonly gap?: number | undefined;
  readonly padding?: number | undefined;
}

export interface GridChildPlacement {
  readonly col: number;
  readonly row: number;
  readonly colSpan?: number | undefined;
  readonly rowSpan?: number | undefined;
}

export interface LinearChildPlacement {
  readonly flex?: number | undefined;
  readonly align?: 'stretch' | 'start' | 'center' | 'end' | undefined;
}

export interface StackChildPlacement {
  readonly left?: number | undefined;
  readonly top?: number | undefined;
  readonly right?: number | undefined;
  readonly bottom?: number | undefined;
}

export interface LinearLayoutSpec {
  readonly type: 'row' | 'column';
  readonly gap?: number | undefined;
  readonly padding?: number | undefined;
}
