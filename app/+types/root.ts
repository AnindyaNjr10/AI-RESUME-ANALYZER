export type Route = {
  LinksFunction: () =>
    | Array<{
        rel: string;
        href: string;
        crossOrigin?: string;
      }>
    | undefined;
  ErrorBoundaryProps: {
    error: unknown;
  };
};
