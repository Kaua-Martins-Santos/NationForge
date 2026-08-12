export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">NationForge</h1>
        <p className="mt-2 text-lg text-neutral-400">Simulador multiplayer de países.</p>
      </div>

      <p className="text-sm text-neutral-500">
        Projeto em construção. Nenhuma funcionalidade de jogo foi implementada ainda — esta página
        existe apenas para confirmar que o frontend está funcionando.
      </p>
    </main>
  );
}
