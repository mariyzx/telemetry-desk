import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { TracePointDiagnosisBlock } from './trace-point-diagnosis.js';

afterEach(() => {
  cleanup();
});

it('renders probable cause in Portuguese with hedged confidence', () => {
  render(<TracePointDiagnosisBlock cause="local_network" confidence={0.65} />);

  expect(
    screen.getByText(
      'Causa provável: Rede local / gateway · Confiança estimada: 65% (não é certeza absoluta)',
    ),
  ).toBeInTheDocument();
});

it('renders nothing while diagnosis is still pending', () => {
  const { container } = render(<TracePointDiagnosisBlock cause={null} confidence={null} />);
  expect(container).toBeEmptyDOMElement();
});
