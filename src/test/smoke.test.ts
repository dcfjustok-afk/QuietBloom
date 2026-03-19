import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

function SmokeFixture() {
  return React.createElement("button", { type: "button" }, "QuietBloom test harness");
}

describe("Wave 0 smoke test", () => {
  it("renders in jsdom without Tauri runtime", () => {
    render(React.createElement(SmokeFixture));

    expect(screen.getByRole("button", { name: "QuietBloom test harness" })).toBeDefined();
  });
});