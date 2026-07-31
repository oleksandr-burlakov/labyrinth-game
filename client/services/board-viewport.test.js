import { describe, expect, it } from "vitest";
import { BoardViewport, isTouchPointer } from "./board-viewport.js";

describe("BoardViewport", () => {
  it("recognizes Phaser and browser touch pointers", () => {
    expect(isTouchPointer({ wasTouch: true })).toBe(true); expect(isTouchPointer({ event: { pointerType: "touch" } })).toBe(true); expect(isTouchPointer({ pointerType: "mouse" })).toBe(false);
  });

  it("fits a board within its region and converts screen coordinates", () => {
    const viewport = new BoardViewport(); viewport.setRegion({ x: 10, y: 20, width: 300, height: 200 }, { preserveView: false });
    expect(viewport.cell).toBe(20); expect(viewport.layout().gridX).toBe(60); expect(viewport.toCell(70, 30)).toEqual({ x: 0, y: 0 });
  });

  it("keeps pinch zoom anchored and bounds panning", () => {
    const viewport = new BoardViewport(); viewport.setRegion({ x: 0, y: 0, width: 300, height: 200 }, { preserveView: false });
    const anchoredCell = viewport.toCell(150, 100, false); viewport.zoomAt(9, 150, 100); expect(viewport.zoom).toBe(2.5); expect(viewport.toCell(150, 100, false)).toEqual(anchoredCell);
    viewport.panBy(9999, -9999); expect(viewport.panX).toBeLessThanOrEqual((viewport.boardWidth - 300) / 2); expect(viewport.panY).toBeGreaterThanOrEqual(-(viewport.boardHeight - 200) / 2);
  });
});
