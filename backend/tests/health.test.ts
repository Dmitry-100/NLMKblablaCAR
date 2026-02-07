import { describe, it, expect, vi } from 'vitest';
import { Request, Response } from 'express';

const healthHandler = (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
};

function createMockResponse() {
  const json = vi.fn();
  const res = { json } as unknown as Response;
  return { res, json };
}

describe('Health Check API', () => {
  it('should return status ok', async () => {
    const { res, json } = createMockResponse();
    healthHandler({} as Request, res);
    const payload = json.mock.calls[0]?.[0];

    expect(payload).toHaveProperty('status', 'ok');
    expect(payload).toHaveProperty('timestamp');
  });

  it('should return valid ISO timestamp', async () => {
    const { res, json } = createMockResponse();
    healthHandler({} as Request, res);
    const payload = json.mock.calls[0]?.[0];
    const timestamp = new Date(payload.timestamp);
    expect(timestamp).toBeInstanceOf(Date);
    expect(isNaN(timestamp.getTime())).toBe(false);
  });
});
