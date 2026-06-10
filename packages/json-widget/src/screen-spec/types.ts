export interface ScreenTextStyle {
  readonly color?: string | undefined;
  readonly background?: string | undefined;
  readonly fontSize?: number | undefined;
}

export interface ScreenLayoutFrame {
  readonly maxWidth: number;
  readonly maxHeight: number;
}

export interface ScreenPlacement {
  readonly col?: number | undefined;
  readonly row?: number | undefined;
  readonly colSpan?: number | undefined;
  readonly rowSpan?: number | undefined;
  readonly top?: number | undefined;
  readonly right?: number | undefined;
  readonly left?: number | undefined;
  readonly bottom?: number | undefined;
}

interface ScreenNodeBase {
  readonly gap?: number | undefined;
  readonly padding?: number | undefined;
  readonly background?: string | undefined;
}

export interface ScreenTextNode extends ScreenPlacement {
  readonly kind: 'text';
  readonly content: string;
  readonly style?: ScreenTextStyle | undefined;
}

export interface ScreenPanelNode extends ScreenPlacement {
  readonly kind: 'panel';
  readonly content: string;
  readonly background?: string | undefined;
  readonly style?: ScreenTextStyle | undefined;
}

export interface ScreenExpandedNode {
  readonly kind: 'expanded';
  readonly flex?: number | undefined;
  readonly child: ScreenNode;
}

export interface ScreenRowNode extends ScreenNodeBase, ScreenPlacement {
  readonly kind: 'row';
  readonly children: readonly ScreenNode[];
}

export interface ScreenColumnNode extends ScreenNodeBase, ScreenPlacement {
  readonly kind: 'column';
  readonly children: readonly ScreenNode[];
}

export interface ScreenGridNode extends ScreenNodeBase {
  readonly kind: 'grid';
  readonly columns: number;
  readonly children: readonly ScreenNode[];
}

export interface ScreenStackNode extends ScreenNodeBase {
  readonly kind: 'stack';
  readonly children: readonly ScreenNode[];
}

export type ScreenNode =
  | ScreenTextNode
  | ScreenPanelNode
  | ScreenExpandedNode
  | ScreenRowNode
  | ScreenColumnNode
  | ScreenGridNode
  | ScreenStackNode;

export interface JdwScreenSpec {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly frameWidth: number;
  readonly layout: ScreenLayoutFrame;
  readonly root: ScreenNode;
}
