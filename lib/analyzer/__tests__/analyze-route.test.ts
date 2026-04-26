import { describe, expect, it } from "vitest";
import { POST } from "../../../app/api/analyze/route";

describe("POST /api/analyze", () => {
  it("returns a 400 response for a null JSON body", async () => {
    const response = await POST(
      new Request("https://vibecheck.test/api/analyze", {
        method: "POST",
        body: "null"
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Request body must be a JSON object."
    });
  });
});
