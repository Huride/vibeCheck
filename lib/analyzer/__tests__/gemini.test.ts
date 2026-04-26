import { describe, expect, it } from "vitest";
import { getGeminiApiKeys, parseGeminiJson, selectGeminiApiKey } from "../gemini";

describe("selectGeminiApiKey", () => {
  it("prefers GEMINI_API_KEY before numbered fallback keys", () => {
    expect(
      selectGeminiApiKey({
        GEMINI_API_KEY: "primary",
        GEMINI_API_KEY_2: "secondary"
      })
    ).toBe("primary");
  });

  it("uses the first numbered Gemini key when the primary key is missing", () => {
    expect(
      selectGeminiApiKey({
        GEMINI_API_KEY_3: "third",
        GEMINI_API_KEY_2: "second"
      })
    ).toBe("second");
  });
});

describe("getGeminiApiKeys", () => {
  it("returns all configured Gemini keys in retry order", () => {
    expect(
      getGeminiApiKeys({
        GEMINI_API_KEY_3: " third ",
        GEMINI_API_KEY: " primary ",
        GEMINI_API_KEY_2: " second "
      })
    ).toEqual(["primary", "second", "third"]);
  });
});

describe("parseGeminiJson", () => {
  it("extracts JSON from a fenced Gemini response", () => {
    expect(parseGeminiJson('```json\n{"summary":"ok","fixPrompt":"fix it"}\n```')).toEqual({
      summary: "ok",
      fixPrompt: "fix it"
    });
  });
});
