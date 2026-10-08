'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchExamples, type ExampleDto } from '../lib/api';
import { useDebounced } from '../lib/use-debounced';

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'empty' }
  | { kind: 'partial'; items: ExampleDto[] }
  | { kind: 'success'; items: ExampleDto[] };

/**
 * Reference implementation of the five view states.
 * Copy this shape per project: no screen ships with an undefined empty or error state.
 */
export function ExamplesList() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query);
  const [state, setState] = useState<State>({ kind: 'loading' });
  const statusRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    // Cancel the superseded request rather than racing it to setState.
    const controller = new AbortController();
    setState({ kind: 'loading' });

    fetchExamples(20, controller.signal)
      .then((page) => {
        const items = page.items.filter((i) =>
          i.name.toLowerCase().includes(debouncedQuery.toLowerCase()),
        );
        if (items.length === 0) setState({ kind: 'empty' });
        else if (page.nextCursor) setState({ kind: 'partial', items });
        else setState({ kind: 'success', items });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setState({ kind: 'error', message: 'Could not load examples.' });
      });

    return () => controller.abort();
  }, [debouncedQuery]);

  return (
    <section>
      <label htmlFor="example-search">Search examples</label>
      <input
        id="example-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type to filter"
      />

      {/* Async state changes are announced, not only shown. */}
      <p ref={statusRef} role="status" aria-live="polite" className="status">
        {state.kind === 'loading' && 'Loading examples…'}
        {state.kind === 'error' && state.message}
        {state.kind === 'empty' && 'No examples yet.'}
        {(state.kind === 'success' || state.kind === 'partial') &&
          `${state.items.length} example${state.items.length === 1 ? '' : 's'}.`}
      </p>

      {state.kind === 'error' && (
        <button type="button" onClick={() => setQuery((q) => `${q}`)}>
          Retry
        </button>
      )}

      {(state.kind === 'success' || state.kind === 'partial') && (
        <ul>
          {state.items.map((item) => (
            <li key={item.id}>
              {item.name} <time dateTime={item.createdAt}>{item.createdAt.slice(0, 10)}</time>
            </li>
          ))}
        </ul>
      )}

      {state.kind === 'partial' && <p className="status">More results available.</p>}
    </section>
  );
}
