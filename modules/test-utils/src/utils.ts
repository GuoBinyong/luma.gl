// Get the bounding box of a DOMElement relative to the page
export function getBoundingBoxInPage(domElement: HTMLElement): {x: number; y: number; width: number; height: number;} {
  const bbox = domElement.getBoundingClientRect();
  return {
    x: window.scrollX + bbox.x,
    y: window.scrollY + bbox.y,
    width: bbox.width,
    height: bbox.height
  };
}
