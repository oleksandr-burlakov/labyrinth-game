import { describe, expect, it } from "vitest";
import { createAssetRegistry, resolveAsset } from "./asset-catalog.js";

describe("asset catalog", () => {
  const files = {
    "../assets/game/treasure.png": "/assets/treasure.png",
    "../assets/game/treasure.inventory.webp": "/assets/treasure.inventory.webp",
    "../assets/game/player.2.png": "/assets/player.2.png",
    "../assets/game/player.1.png": "/assets/player.1.png",
  };

  it("falls back to the base asset when a context variant is absent", () => {
    expect(resolveAsset(files, "treasure", "board")?.frames[0].url).toBe("/assets/treasure.png");
  });

  it("prefers a context-specific asset and leaves missing assets unresolved", () => {
    expect(resolveAsset(files, "treasure", "inventory")?.frames[0].url).toBe("/assets/treasure.inventory.webp");
    expect(resolveAsset(files, "bear_trap")).toBeNull(); expect(createAssetRegistry(files)["bear_trap:base"]).toBeNull();
  });

  it("orders numbered frames for looping animation", () => {
    expect(resolveAsset(files, "player")?.frames.map((frame) => frame.url)).toEqual(["/assets/player.1.png", "/assets/player.2.png"]);
  });
});
