interface InvalidLocationErrorProperties {
  readonly message: string;
  readonly title: string;
}

export const InvalidLocationError = ({
  message,
  title,
}: InvalidLocationErrorProperties) => (
  <main className="flex min-h-screen items-center justify-center bg-background">
    <div className="text-center">
      <h1 className="mb-4 text-2xl font-bold text-foreground">{title}</h1>
      <p className="text-muted-foreground">{message}</p>
    </div>
  </main>
);
