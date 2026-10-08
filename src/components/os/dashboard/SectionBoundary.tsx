"use client";

import { Component, type ReactNode } from "react";
import { useRouter } from "next/navigation";

interface State { failed: boolean }
class Boundary extends Component<{ label: string; onRetry: () => void; children: ReactNode }, State> {
  state: State = { failed: false };
  static getDerivedStateFromError(): State { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="os-card p-6" role="alert">
        <p className="text-[14px] font-medium">Unable to load {this.props.label}.</p>
        <p className="mt-1 text-[13px] text-[var(--muted)]">The rest of the dashboard is unaffected.</p>
        <button type="button" onClick={() => { this.setState({ failed: false }); this.props.onRetry(); }} className="mt-3 rounded-[10px] bg-[var(--primary)] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[var(--primary-hover)]">Retry</button>
      </div>
    );
  }
}

/** Isolates a failing section so one broken query never blanks the whole dashboard. */
export default function SectionBoundary({ label, children }: { label: string; children: ReactNode }) {
  const router = useRouter();
  return <Boundary label={label} onRetry={() => router.refresh()}>{children}</Boundary>;
}
