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
  readonly flexFit?: 'tight' | 'loose' | undefined;
  readonly align?: 'stretch' | 'start' | 'center' | 'end' | undefined;
  readonly mainSize?: number | undefined;
  readonly crossSize?: number | undefined;
}

export interface StackChildPlacement {
  readonly left?: number | undefined;
  readonly top?: number | undefined;
  readonly right?: number | undefined;
  readonly bottom?: number | undefined;
}

export interface LinearLayoutSpec {
  readonly type: 'row' | 'column';
  readonly mainAxisAlignment?:
    | 'start'
    | 'center'
    | 'end'
    | 'spaceBetween'
    | 'spaceAround'
    | 'spaceEvenly'
    | undefined;
  readonly crossAxisAlignment?: 'stretch' | 'start' | 'center' | 'end' | undefined;
  readonly gap?: number | undefined;
  readonly padding?: number | undefined;
}
