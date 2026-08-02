import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, Tool, ToolUseBlock } from "@anthropic-ai/sdk/resources/messages";
import { executeIntent } from "@/lib/intentExecutor";
import type { Intent } from "@/lib/intents";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const MAX_TOOL_ROUNDS = 4;

export function isLlmConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const TOOLS: Tool[] = [
  {
    name: "add_shopping_item",
    description: "Add an item to the family's shared shopping list.",
    input_schema: { type: "object", properties: { item: { type: "string" } }, required: ["item"] },
  },
  {
    name: "remove_shopping_item",
    description: "Remove or mark purchased an item on the shopping list, by name (fuzzy match).",
    input_schema: { type: "object", properties: { item: { type: "string" } }, required: ["item"] },
  },
  {
    name: "list_shopping_items",
    description: "List everything currently pending on the shopping list.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_dinner_plan",
    description: "Get tonight's dinner plan: the meal, who's cooking, who's on dishes.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_jobs",
    description: "List open (not-yet-done) household jobs.",
    input_schema: {
      type: "object",
      properties: { scope: { type: "string", enum: ["mine", "all"], description: "'mine' for just the current person's jobs, 'all' for the whole family's" } },
      required: ["scope"],
    },
  },
  {
    name: "complete_job",
    description: "Mark a job as done, by its title (fuzzy match), and award its points.",
    input_schema: { type: "object", properties: { title: { type: "string" } }, required: ["title"] },
  },
  {
    name: "get_tomorrow",
    description: "List tomorrow's calendar events (sport, school, appointments).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "find_event",
    description: "Find an upcoming calendar event by name/keyword, e.g. 'soccer' or 'dentist'.",
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
  {
    name: "get_leaderboard",
    description: "Get the current family points leaderboard, top scorers first.",
    input_schema: { type: "object", properties: {} },
  },
];

function toolCallToIntent(block: ToolUseBlock): Intent {
  const input = block.input as Record<string, unknown>;
  switch (block.name) {
    case "add_shopping_item":
      return { type: "add_shopping_item", item: String(input.item ?? "") };
    case "remove_shopping_item":
      return { type: "remove_shopping_item", item: String(input.item ?? "") };
    case "list_shopping_items":
      return { type: "list_shopping_items" };
    case "get_dinner_plan":
      return { type: "get_dinner_plan" };
    case "list_jobs":
      return { type: "list_jobs", scope: input.scope === "mine" ? "mine" : "all" };
    case "complete_job":
      return { type: "complete_job", title: String(input.title ?? "") };
    case "get_tomorrow":
      return { type: "get_tomorrow" };
    case "find_event":
      return { type: "find_event", query: String(input.query ?? "") };
    case "get_leaderboard":
      return { type: "get_leaderboard" };
    default:
      return { type: "unknown" };
  }
}

export async function llmReply(
  history: { role: "user" | "assistant"; text: string }[],
  familyId: string,
  profileId: string,
  viewerName: string,
  familyMemberNames: string[]
): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const system = `You are the Family AI assistant — a warm, concise household helper speaking to ${viewerName}, one of the members of this family (the others are: ${familyMemberNames.join(", ")}).

Answer naturally and briefly, the way you'd speak out loud — a sentence or two, not a report. For anything about jobs, the shopping list, dinner, the calendar, or points, always use a tool rather than guessing — the data changes constantly and you don't have it memorised. If a request is ambiguous (e.g. which of two similar items to remove, which job someone means), ask a short clarifying question instead of guessing. If someone asks something with no relevant tool (general chat, a question about the app itself), just answer directly and briefly.`;

  const messages: MessageParam[] = history.map((m) => ({ role: m.role, content: m.text }));

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system,
      tools: TOOLS,
      messages,
    });

    const toolUses = response.content.filter((b): b is ToolUseBlock => b.type === "tool_use");

    if (toolUses.length === 0) {
      const text = response.content.find((b) => b.type === "text");
      return text && "text" in text ? text.text : "…";
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults = await Promise.all(
      toolUses.map(async (block) => {
        const intent = toolCallToIntent(block);
        const result = await executeIntent(intent, familyId, profileId);
        return { type: "tool_result" as const, tool_use_id: block.id, content: result };
      })
    );

    messages.push({ role: "user", content: toolResults });
  }

  return "Sorry, that took a few too many steps to work out — try asking a bit more directly?";
}
