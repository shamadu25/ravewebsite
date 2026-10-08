export class ToolDeniedError extends Error {
  constructor(public tool: string, public agentKey: string) {
    super(`Agent "${agentKey}" has not been granted tool "${tool}".`);
    this.name = "ToolDeniedError";
  }
}

export class ApprovalPendingError extends Error {
  constructor(public approvalId: number) {
    super(`Waiting for human approval #${approvalId}.`);
    this.name = "ApprovalPendingError";
  }
}

/** A policy gate (opt-out, outbound pause, missing address) stopped the action. Retrying cannot help. */
export class ToolBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolBlockedError";
  }
}
