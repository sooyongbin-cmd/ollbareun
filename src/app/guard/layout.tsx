import GuardInstallPrompt from "./guard-install-prompt";

export default function GuardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <GuardInstallPrompt />
    </>
  );
}
