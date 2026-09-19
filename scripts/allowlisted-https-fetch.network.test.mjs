import { createServer as createHttpServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { generate } from 'selfsigned';
import { Agent } from 'undici';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createAllowlistedHttpsFetch } from '../packages/platform/src/network/create-allowlisted-https-fetch.ts';

describe('allowlisted HTTPS network boundary', () => {
  const servers = [];
  const hits = { origin: 0, httpsTarget: 0, httpTarget: 0, sameHostTarget: 0 };
  let dispatcher;
  let origin;
  let httpsTarget;
  let httpTarget;
  let transport;
  let guarded;

  async function listen(server) {
    servers.push(server);
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => {
        server.removeListener('error', reject);
        resolve();
      });
    });
    return server.address().port;
  }

  beforeAll(async () => {
    // Ephemeral credentials never leave memory; normal certificate validation stays enabled.
    const certificate = await generate([{ name: 'commonName', value: 'localhost' }], {
      keyType: 'ec',
      algorithm: 'sha256',
      notBeforeDate: new Date(Date.now() - 60_000),
      notAfterDate: new Date(Date.now() + 3_600_000),
      extensions: [
        { name: 'basicConstraints', cA: false },
        { name: 'keyUsage', digitalSignature: true },
        { name: 'extKeyUsage', serverAuth: true },
        {
          name: 'subjectAltName',
          altNames: [
            { type: 2, value: 'localhost' },
            { type: 7, ip: '127.0.0.1' },
          ],
        },
      ],
    });
    const tls = { key: certificate.private, cert: certificate.cert };
    dispatcher = new Agent({ connect: { ca: certificate.cert, family: 4 } });
    // The dispatcher only supplies fixture trust; native fetch owns redirect semantics.
    transport = (input, init) => globalThis.fetch(input, { ...init, dispatcher });
    httpsTarget = `https://127.0.0.1:${await listen(
      createHttpsServer(tls, (_request, response) => {
        hits.httpsTarget++;
        response.end('https target');
      }),
    )}/target`;
    httpTarget = `http://127.0.0.1:${await listen(
      createHttpServer((_request, response) => {
        hits.httpTarget++;
        response.end('http target');
      }),
    )}/target`;
    const port = await listen(
      createHttpsServer(tls, async (request, response) => {
        hits.origin++;
        const url = new URL(request.url, 'https://localhost');
        if (url.pathname === '/redirect') {
          const target = url.searchParams.get('target');
          response.writeHead(Number(url.searchParams.get('status')), {
            location:
              target === 'https'
                ? httpsTarget
                : target === 'http'
                  ? httpTarget
                  : `${origin}/target`,
          });
          response.end();
        } else if (url.pathname === '/target') {
          hits.sameHostTarget++;
          response.end('same host target');
        } else {
          const chunks = [];
          for await (const chunk of request) chunks.push(chunk);
          response.setHeader('content-type', 'application/json');
          response.end(
            JSON.stringify({
              method: request.method,
              body: Buffer.concat(chunks).toString(),
              header: request.headers['x-fixture'],
            }),
          );
        }
      }),
    );
    origin = `https://localhost:${port}`;
    guarded = createAllowlistedHttpsFetch({ allowedHosts: ['localhost'], fetch: transport });
  }, 15_000);

  afterAll(async () => {
    try {
      await dispatcher?.destroy();
    } finally {
      await Promise.all(
        servers.map(
          (server) =>
            new Promise((resolve, reject) => {
              server.close((error) =>
                error && error.code !== 'ERR_SERVER_NOT_RUNNING' ? reject(error) : resolve(),
              );
              server.closeAllConnections();
            }),
        ),
      );
    }
  });

  beforeEach(() => {
    for (const key of Object.keys(hits)) hits[key] = 0;
  });
  const redirectUrl = (status, target) => `${origin}/redirect?status=${status}&target=${target}`;
  const targetsUntouched = () => {
    expect(hits.httpsTarget).toBe(0);
    expect(hits.httpTarget).toBe(0);
    expect(hits.sameHostTarget).toBe(0);
  };

  it('delivers direct Request body headers and method over verified TLS', async () => {
    const request = new Request(`${origin}/echo`, {
      method: 'POST',
      body: 'fixture body',
      headers: { 'x-fixture': 'present' },
      redirect: 'follow',
    });
    const response = await guarded(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      method: 'POST',
      body: 'fixture body',
      header: 'present',
    });
    expect(hits.origin).toBe(1);
    targetsUntouched();
  });

  it('proves native fetch can reach each redirect target with the same TLS trust', async () => {
    for (const [target, body] of [
      ['https', 'https target'],
      ['http', 'http target'],
      ['same', 'same host target'],
    ]) {
      const response = await transport(redirectUrl(302, target));
      expect(response.redirected).toBe(true);
      expect(await response.text()).toBe(body);
    }
    expect(hits.httpsTarget).toBe(1);
    expect(hits.httpTarget).toBe(1);
    expect(hits.sameHostTarget).toBe(1);
  });

  for (const [target, label] of [
    ['https', 'cross-host HTTPS'],
    ['http', 'HTTP downgrade'],
    ['same', 'same-host HTTPS'],
  ]) {
    it(`blocks every redirect status to ${label} before the target is contacted`, async () => {
      for (const status of [301, 302, 303, 307, 308]) {
        await expect(guarded(redirectUrl(status, target))).rejects.toBeInstanceOf(TypeError);
        targetsUntouched();
      }
      expect(hits.origin).toBe(5);
    });
  }

  it('does not allow Request or init redirect options to opt out', async () => {
    for (const mode of ['follow', 'manual']) {
      await expect(
        guarded(new Request(redirectUrl(302, 'https'), { redirect: mode })),
      ).rejects.toBeInstanceOf(TypeError);
      await expect(guarded(redirectUrl(307, 'http'), { redirect: mode })).rejects.toBeInstanceOf(
        TypeError,
      );
    }
    expect(hits.origin).toBe(4);
    targetsUntouched();
  });

  it('rejects disallowed direct destinations before making a request', async () => {
    await expect(guarded(httpsTarget)).rejects.toThrow(/allowlist/);
    await expect(guarded(httpTarget)).rejects.toThrow(/https/i);
    expect(hits.origin).toBe(0);
    targetsUntouched();
  });
});
