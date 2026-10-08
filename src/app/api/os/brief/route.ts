import { api } from "@/lib/os/http";
import { generateBrief } from "@/lib/os/commander";

export const POST = api("commander.run", async () => generateBrief());
