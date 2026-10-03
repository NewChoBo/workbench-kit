/** Reveal an authored viewport through scrolling ancestors inside the supplied boundary only. */
export function revealCssLayoutNode(root: HTMLElement, nodeId: string): boolean {
  const target = Array.from(root.querySelectorAll<HTMLElement>('[data-layout-node-id]')).find(
    (element) => element.dataset.layoutNodeId === nodeId,
  );
  if (!target) return false;
  let ancestor = target.parentElement;
  while (ancestor && root.contains(ancestor)) {
    if (ancestor.dataset.layoutScrollViewport === 'true') {
      const rect = target.getBoundingClientRect();
      const viewport = ancestor.getBoundingClientRect();
      const left = viewport.left + ancestor.clientLeft;
      const top = viewport.top + ancestor.clientTop;
      const right = left + ancestor.clientWidth;
      const bottom = top + ancestor.clientHeight;
      const nearest = (start: number, end: number, lower: number, upper: number) => {
        if (start < lower && end > upper) return 0;
        return start < lower ? start - lower : end > upper ? end - upper : 0;
      };
      ancestor.scrollLeft += nearest(rect.left, rect.right, left, right);
      ancestor.scrollTop += nearest(rect.top, rect.bottom, top, bottom);
    }
    if (ancestor === root) break;
    ancestor = ancestor.parentElement;
  }
  return true;
}
