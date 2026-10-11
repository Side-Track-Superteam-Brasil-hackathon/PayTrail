/** Tela ainda não implementada. `spec` aponta o cenário/fatia em specs/ que descreve o comportamento. */
export function Placeholder({ title, spec }: { title: string; spec: string }) {
  return (
    <section className="card">
      <h1>{title}</h1>
      <p className="muted">To do — see specs: {spec}</p>
    </section>
  );
}
