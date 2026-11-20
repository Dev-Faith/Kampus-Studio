'use client';

import React from 'react';

export function CheatSheetView() {
  return (
    <section className="cheatsheet-view">
      <div className="cheatsheet-container">
        <h2>NestJS Backend Engineering Cheat Sheet &amp; Mental Models</h2>
        <p className="muted-text">
          Quick reference for when to use Middleware, Guards, Interceptors, Pipes, and Exception
          Filters in the Kampus PropTech architecture.
        </p>

        <div className="cs-onion-diagram">
          <div className="cs-stage cs-mw">
            <strong>1. Middleware</strong>
            <span>Correlation IDs, CORS, raw body parsing</span>
          </div>
          <div className="cs-arrow">→</div>
          <div className="cs-stage cs-guard">
            <strong>2. Guards</strong>
            <span>Rate limit, JWT AuthN, RBAC &amp; Ownership AuthZ</span>
          </div>
          <div className="cs-arrow">→</div>
          <div className="cs-stage cs-int">
            <strong>3. Interceptors (Pre)</strong>
            <span>Cache lookup, timer start, request logging</span>
          </div>
          <div className="cs-arrow">→</div>
          <div className="cs-stage cs-pipe">
            <strong>4. Pipes</strong>
            <span>ParseInt, Trim/Slug, DTO ValidationPipe</span>
          </div>
          <div className="cs-arrow">→</div>
          <div className="cs-stage cs-ctrl">
            <strong>5. Controller &amp; Service</strong>
            <span>Business rules, DB transactions, domain events</span>
          </div>
          <div className="cs-arrow">→</div>
          <div className="cs-stage cs-int">
            <strong>6. Interceptors (Post)</strong>
            <span>RxJS map() envelope, redact secrets, timeout()</span>
          </div>
          <div className="cs-arrow">→</div>
          <div className="cs-stage cs-filter">
            <strong>7. Exception Filters</strong>
            <span>Catch errors, map DB constraints &rarr; JSON error</span>
          </div>
        </div>

        <div className="cs-grid">
          <div className="cs-card">
            <h3>When do I use which building block?</h3>
            <table className="cs-table">
              <thead>
                <tr>
                  <th>Construct</th>
                  <th>Single Responsibility</th>
                  <th>Knows Target Handler?</th>
                  <th>Can Transform Response?</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>Middleware</code>
                  </td>
                  <td>
                    Mutate raw <code>req</code>/<code>res</code> (e.g. <code>x-request-id</code>)
                  </td>
                  <td>No (runs before routing)</td>
                  <td>No</td>
                </tr>
                <tr>
                  <td>
                    <code>Guard</code>
                  </td>
                  <td>
                    Allow or deny access (<code>boolean</code> or throw 401/403/429)
                  </td>
                  <td>
                    Yes (<code>ExecutionContext</code> + <code>Reflector</code>)
                  </td>
                  <td>No</td>
                </tr>
                <tr>
                  <td>
                    <code>Interceptor</code>
                  </td>
                  <td>Wrap execution before &amp; after via RxJS stream</td>
                  <td>
                    Yes (<code>ExecutionContext</code>)
                  </td>
                  <td>
                    Yes (<code>map</code>, <code>tap</code>, <code>timeout</code>, short-circuit
                    cache)
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>Pipe</code>
                  </td>
                  <td>Transform or validate a single route argument</td>
                  <td>
                    Receives <code>ArgumentMetadata</code>
                  </td>
                  <td>Transforms input argument only</td>
                </tr>
                <tr>
                  <td>
                    <code>ExceptionFilter</code>
                  </td>
                  <td>Turn thrown errors into structured HTTP error JSON</td>
                  <td>
                    Receives <code>ArgumentsHost</code>
                  </td>
                  <td>Replaces error response</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="cs-card">
            <h3>HTTP Status Codes Every Backend Engineer Must Know</h3>
            <table className="cs-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>NestJS Exception</th>
                  <th>When to Use It</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>200 / 201 / 204</code>
                  </td>
                  <td>—</td>
                  <td>
                    <code>200</code> OK, <code>201</code> Resource Created, <code>204</code>{' '}
                    Deleted (no body)
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>400 Bad Request</code>
                  </td>
                  <td>
                    <code>BadRequestException</code>
                  </td>
                  <td>Malformed input, failed DTO validation or pipe parsing</td>
                </tr>
                <tr>
                  <td>
                    <code>401 Unauthorized</code>
                  </td>
                  <td>
                    <code>UnauthorizedException</code>
                  </td>
                  <td>Missing, invalid, or expired authentication credentials</td>
                </tr>
                <tr>
                  <td>
                    <code>403 Forbidden</code>
                  </td>
                  <td>
                    <code>ForbiddenException</code>
                  </td>
                  <td>Authenticated, but insufficient role or not resource owner</td>
                </tr>
                <tr>
                  <td>
                    <code>404 Not Found</code>
                  </td>
                  <td>
                    <code>NotFoundException</code>
                  </td>
                  <td>Entity ID does not exist (or hidden behind disabled feature flag)</td>
                </tr>
                <tr>
                  <td>
                    <code>408 Request Timeout</code>
                  </td>
                  <td>
                    <code>RequestTimeoutException</code>
                  </td>
                  <td>
                    Downstream call exceeded SLA in <code>TimeoutInterceptor</code>
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>409 Conflict</code>
                  </td>
                  <td>
                    <code>ConflictException</code>
                  </td>
                  <td>Duplicate unique key (e.g. student email already registered)</td>
                </tr>
                <tr>
                  <td>
                    <code>422 Unprocessable</code>
                  </td>
                  <td>
                    <code>UnprocessableEntityException</code>
                  </td>
                  <td>Valid syntax, but breaks a domain rule (e.g. insufficient escrow funds)</td>
                </tr>
                <tr>
                  <td>
                    <code>429 Too Many Requests</code>
                  </td>
                  <td>
                    <code>ThrottlerException</code>
                  </td>
                  <td>
                    Client exceeded rate limit window; include <code>Retry-After</code>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
