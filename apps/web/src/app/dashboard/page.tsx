'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { RequireSession } from '../../components/require-session';
import { ResourcesPanel } from '../../components/resources-panel';
import { HeroFigure, Meter, StatGroup, StatTile } from '../../components/stats';
import { TaxRateControl } from '../../components/tax-rate-control';
import { useLogout } from '../../lib/auth';
import { formatCompact, formatDateTime, formatMoney } from '../../lib/format';
import { useNation } from '../../lib/nations';
import { GOVERNMENT_LABELS, type Nation } from '../../lib/schemas';

function NationDashboard({ nation }: { nation: Nation }) {
  const logout = useLogout();

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl leading-none" aria-hidden="true">
            {nation.flag}
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{nation.name}</h1>
            <p className="text-ink-secondary">
              {GOVERNMENT_LABELS[nation.government]} · capital {nation.capital}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm transition hover:border-neutral-500 disabled:opacity-50"
        >
          {logout.isPending ? 'Saindo…' : 'Sair'}
        </button>
      </header>

      <HeroFigure label="População" value={nation.population.total} unit="habitantes" />

      <StatGroup title="Demografia">
        <StatTile
          label="Natalidade"
          value={`${nation.population.birthRatePerThousand}‰`}
          unit="ao ano"
        />
        <StatTile
          label="Mortalidade"
          value={`${nation.population.deathRatePerThousand}‰`}
          unit="ao ano"
        />
        <StatTile label="Empregados" value={formatCompact(nation.population.employed)} />
        <StatTile label="Desemprego" value={`${nation.population.unemploymentRate}%`} />
      </StatGroup>

      <StatGroup title="Sociedade">
        <Meter label="Felicidade" value={nation.happiness} />
        <Meter label="Estabilidade" value={nation.stability} />
        <Meter label="Saúde" value={nation.population.health} />
        <Meter label="Educação" value={nation.population.education} />
      </StatGroup>

      <StatGroup title="Economia e território">
        <StatTile label="PIB" value={formatMoney(nation.economy.gdp)} unit="ao ano" />
        <StatTile label="Tesouro" value={formatMoney(nation.economy.treasury)} />
        <StatTile label="Território" value={formatCompact(nation.territory)} unit="km²" />
        <StatTile label="Emissões" value={formatCompact(nation.emissions)} />
      </StatGroup>

      <TaxRateControl economy={nation.economy} />

      <ResourcesPanel resources={nation.resources} />

      <StatGroup title="Desenvolvimento">
        <StatTile label="Tecnologia" value={formatCompact(nation.technology)} />
        <StatTile label="Poder militar" value={formatCompact(nation.militaryPower)} />
        <StatTile label="Infraestrutura" value={formatCompact(nation.infrastructure)} />
      </StatGroup>

      <p className="text-sm text-ink-muted">
        População e economia evoluem por hora decorrida, mesmo com você offline. Simulado até{' '}
        {formatDateTime(nation.simulatedUntil)}. Produção, recursos e os demais atributos ainda são
        estáticos.
      </p>
    </main>
  );
}

function DashboardContent() {
  const router = useRouter();
  const nation = useNation();

  const hasNoNation = nation.isSuccess && nation.data === null;

  useEffect(() => {
    if (hasNoNation) {
      router.replace('/nations/new');
    }
  }, [hasNoNation, router]);

  if (nation.isLoading || hasNoNation) {
    return <p className="p-6 text-ink-muted">Carregando seu país…</p>;
  }

  if (nation.isError) {
    return <p className="p-6 text-ink-secondary">Não foi possível carregar seu país.</p>;
  }

  return nation.data ? <NationDashboard nation={nation.data} /> : null;
}

export default function DashboardPage() {
  return (
    <RequireSession>
      <DashboardContent />
    </RequireSession>
  );
}
