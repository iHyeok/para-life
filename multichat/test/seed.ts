// bun test/seed.ts <state dir> <count>: write `count` chat messages, 5 minutes apart, ending now
import { ChatStore } from "../../channel/store";

const [dir, countArg] = process.argv.slice(2);
const count = Number(countArg);
const store = new ChatStore(dir);
const base = Date.now() - count * 300000;
for (let i = 0; i < count; i++) {
  store.save({
    id: `seed${String(i).padStart(3, "0")}`,
    from: i % 2 ? "assistant" : "user",
    text: `seed message ${i}`,
    ts: base + i * 300000,
  });
}
store.close();
