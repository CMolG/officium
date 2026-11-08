"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { SceneFailure } from "./SceneFailure";

interface BoundaryProps {
  route: string;
  children: ReactNode;
}

export class SceneErrorBoundary extends Component<
  BoundaryProps,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Technical detail in the console; on screen, plain language and a way out.
    if (typeof console !== "undefined") {
      console.error(
        `[Theater] Scene ${this.props.route} failed:`,
        error,
        info.componentStack,
      );
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <SceneFailure
        kind="failed"
        onRetry={() => this.setState({ failed: false })}
      />
    );
  }
}
