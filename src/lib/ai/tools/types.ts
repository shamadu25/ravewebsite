export interface Tool {
  name: string;
  execute(input: Record<string, unknown>): Promise<Record<string, unknown>>;
}
