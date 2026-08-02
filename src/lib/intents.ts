// Rule-based intent parser — a stand-in for the real AI assistant.
//
// The Functional Specification (Section 6) calls for an LLM to resolve
// natural speech to a structured action. Wiring that up needs a model
// provider and an API key the family will supply, so for this first
// milestone we hand-match the exact example phrases from that spec with
// regex. It's honest about being a placeholder, not a demo of "real AI" —
// see README.md "Swapping in a real AI model" for how to replace this file
// with an actual LLM call without touching the chat UI or the actions it
// triggers.

export type Intent =
  | { type: "add_shopping_item"; item: string }
  | { type: "remove_shopping_item"; item: string }
  | { type: "list_shopping_items" }
  | { type: "get_dinner_plan" }
  | { type: "list_jobs"; scope: "mine" | "all" }
  | { type: "complete_job"; title: string }
  | { type: "get_tomorrow" }
  | { type: "find_event"; query: string }
  | { type: "get_leaderboard" }
  | { type: "unknown" };

const PATTERNS: Array<{ re: RegExp; build: (m: RegExpMatchArray) => Intent }> = [
  { re: /(?:we'?(?:ve| have)? )?run(?:ning)? out of (.+?)\.?$/i, build: (m) => ({ type: "add_shopping_item", item: clean(m[1]) }) },
  { re: /add (.+?) to (?:the )?(?:shopping )?list\.?$/i, build: (m) => ({ type: "add_shopping_item", item: clean(m[1]) }) },
  { re: /remove (.+?) from (?:the )?list\.?$/i, build: (m) => ({ type: "remove_shopping_item", item: clean(m[1]) }) },
  { re: /(.+?),? we don'?t need (?:it|that|them) anymore\.?$/i, build: (m) => ({ type: "remove_shopping_item", item: clean(m[1]) }) },
  { re: /what do we need from (?:the )?(?:supermarket|shops?|store)\??$/i, build: () => ({ type: "list_shopping_items" }) },
  { re: /what'?s on the shopping list\??$/i, build: () => ({ type: "list_shopping_items" }) },
  { re: /who'?s cooking(?: tonight)?\??$/i, build: () => ({ type: "get_dinner_plan" }) },
  { re: /who'?s on dishes\??$/i, build: () => ({ type: "get_dinner_plan" }) },
  { re: /what'?s for dinner\??$/i, build: () => ({ type: "get_dinner_plan" }) },
  { re: /mark (.+?) (?:as )?done\.?$/i, build: (m) => ({ type: "complete_job", title: clean(m[1]) }) },
  { re: /have i finished my jobs\??$/i, build: () => ({ type: "list_jobs", scope: "mine" }) },
  { re: /what jobs can i do\??$/i, build: () => ({ type: "list_jobs", scope: "mine" }) },
  { re: /what do i have (?:on )?tomorrow\??$/i, build: () => ({ type: "get_tomorrow" }) },
  { re: /what do i have (?:on )?today\??$/i, build: () => ({ type: "get_tomorrow" }) },
  { re: /when is (.+?)\??$/i, build: (m) => ({ type: "find_event", query: clean(m[1]) }) },
  { re: /who'?s winning(?: this week)?\??$/i, build: () => ({ type: "get_leaderboard" }) },
  { re: /how many points do i have\??$/i, build: () => ({ type: "get_leaderboard" }) },
];

function clean(s: string) {
  return s.trim().replace(/^(some |the |a |an )/i, "");
}

export function parseIntent(rawText: string): Intent {
  const text = rawText.trim();
  for (const { re, build } of PATTERNS) {
    const m = text.match(re);
    if (m) return build(m);
  }
  return { type: "unknown" };
}
