import {
  Component,
  Suspense,
  type ErrorInfo,
  type ReactNode,
} from "react";

interface RouteContentBoundaryProps {
  children: ReactNode;
  loadingFallback: ReactNode;
  errorFallback: ReactNode;
  resetKey: string;
}

interface RouteErrorBoundaryProps {
  children: ReactNode;
  errorFallback: ReactNode;
  resetKey: string;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
}

class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return {
      hasError: true,
    };
  }

  componentDidCatch(
    error: unknown,
    errorInfo: ErrorInfo,
  ) {
    console.error(
      "FilmGeezer route content failed to render.",
      error,
      errorInfo,
    );
  }

  componentDidUpdate(
    previousProps: RouteErrorBoundaryProps,
  ) {
    if (
      this.state.hasError &&
      previousProps.resetKey !==
        this.props.resetKey
    ) {
      this.setState({
        hasError: false,
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.errorFallback;
    }

    return this.props.children;
  }
}

export default function RouteContentBoundary({
  children,
  loadingFallback,
  errorFallback,
  resetKey,
}: RouteContentBoundaryProps) {
  return (
    <RouteErrorBoundary
      errorFallback={errorFallback}
      resetKey={resetKey}
    >
      <Suspense
        fallback={loadingFallback}
      >
        {children}
      </Suspense>
    </RouteErrorBoundary>
  );
}