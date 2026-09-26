import { useEffect, useState } from 'react';
import { Button } from '@workbench-kit/react/primitives';
import { createSampleHost } from '../createSampleHost.js';
import {
  createSampleBackendFixture,
  sampleBackendScenarios,
  type SampleBackendFixture,
  type SampleBackendScenario,
} from './sample-backend-fixture.js';
import './sample-backend-lab.css';

/** Same sample assembly as the ordinary app; controls affect only the fake transport. */
export function SampleBackendLab({
  initialScenario = 'signed-out',
}: {
  initialScenario?: SampleBackendScenario | undefined;
}) {
  const [scenario, setScenario] = useState(initialScenario);
  const [generation, setGeneration] = useState(0);
  const [, refresh] = useState(0);
  const [active, setActive] = useState<{ key: string; fixture: SampleBackendFixture }>();
  const key = `${scenario}:${generation}`;
  useEffect(() => {
    let mounted = true;
    const fixture = createSampleBackendFixture(scenario, () => {
      if (mounted) refresh((revision) => revision + 1);
    });
    setActive({ key, fixture });
    return () => {
      mounted = false;
      fixture.dispose();
    };
  }, [key, scenario]);
  const fixture = active?.key === key ? active.fixture : undefined;
  const details = sampleBackendScenarios.find((item) => item.id === scenario)!;
  return (
    <main className="sample-backend-lab" aria-label="Sample backend verification">
      <header className="sample-backend-lab__controls">
        <div className="sample-backend-lab__toolbar">
          <label htmlFor="sample-backend-scenario">Scenario</label>
          <select
            id="sample-backend-scenario"
            value={scenario}
            onChange={(event) => {
              setScenario(event.target.value as SampleBackendScenario);
            }}
          >
            {sampleBackendScenarios.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <Button type="button" onClick={() => setGeneration((value) => value + 1)}>
            Reset scenario
          </Button>
          <Button
            type="button"
            disabled={!fixture?.pendingCount}
            onClick={() => fixture?.releasePending()}
          >
            Release response
          </Button>
        </div>
        <p>{details.description}</p>
        <output aria-label="Backend activity">
          Pending: {fixture?.pendingCount ?? 0} · Session: {fixture?.requestCounts.getSession ?? 0}{' '}
          · Sign-in: {fixture?.requestCounts.signIn ?? 0} · Sign-out:{' '}
          {fixture?.requestCounts.signOut ?? 0}
        </output>
      </header>
      <section className="sample-backend-lab__host" aria-label="Sample app under test" key={key}>
        {fixture ? (
          createSampleHost({ backendClient: fixture.client })
        ) : (
          <p role="status">Preparing scenario...</p>
        )}
      </section>
    </main>
  );
}
