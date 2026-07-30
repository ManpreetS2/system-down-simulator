import type { IncidentBrief, InvestigationSourceId } from '../game/grader/types';

const src = (
  id: InvestigationSourceId,
  label: string,
  timeCostSec: number,
  findings: IncidentBrief['investigations'][number]['findings'],
  extras?: Partial<IncidentBrief['investigations'][number]>,
): IncidentBrief['investigations'][number] => ({
  id,
  label,
  timeCostSec,
  findings,
  ...extras,
});

/**
 * Progressive-disclosure briefs keyed by incident id.
 * Initial view stays lean; deeper detail unlocks via investigation.
 */
export const INCIDENT_BRIEFS: Record<string, IncidentBrief> = {
  'failed-deploy': {
    customerImpact: 'Checkout errors are climbing; some customers cannot complete purchases.',
    initialEvidence: [
      {
        id: 'fd-alert',
        kind: 'confirmed',
        text: 'Deploy #4821 correlated with a sharp rise in 5xx errors two minutes ago.',
      },
    ],
    keyIndicators: ['errorRate', 'revenueLoss', 'health', 'requestVolume'],
    investigations: [
      src(
        'deployments',
        'Recent deployments',
        6,
        [
          {
            id: 'fd-dep-1',
            kind: 'confirmed',
            text: 'Deploy #4821 rolled out checkout-service; previous release #4820 was healthy.',
            glossary: 'A deployment publishes a new version of the service to production.',
          },
          {
            id: 'fd-dep-2',
            kind: 'indicator',
            text: 'New pods report a missing environment variable during startup.',
          },
        ],
        { highlight: true },
      ),
      src('app-logs', 'Application logs', 7, [
        {
          id: 'fd-log-1',
          kind: 'confirmed',
          text: 'CrashLoopBackOff on 3 of 12 pods with config validation errors.',
        },
        {
          id: 'fd-log-2',
          kind: 'assumption',
          text: 'Some engineers suspect a bad migration flag, but that is not confirmed yet.',
        },
      ]),
      src('customer-reports', 'Customer reports', 4, [
        {
          id: 'fd-cust-1',
          kind: 'indicator',
          text: 'Support tickets mention failed checkout after clicking Pay.',
        },
      ]),
      src('db-metrics', 'Database metrics', 5, [
        {
          id: 'fd-db-1',
          kind: 'indicator',
          text: 'Database looks normal — latency and connections are near baseline.',
        },
      ]),
    ],
  },

  'db-overload': {
    customerImpact: 'Pages are timing out; users see spinning loaders across the product.',
    initialEvidence: [
      {
        id: 'db-alert',
        kind: 'confirmed',
        text: 'Primary Postgres CPU is near 100% and the connection pool is exhausted.',
      },
    ],
    keyIndicators: ['dbLatency', 'errorRate', 'cpu', 'revenueLoss'],
    investigations: [
      src(
        'db-metrics',
        'Database metrics',
        6,
        [
          {
            id: 'db-m-1',
            kind: 'confirmed',
            text: 'Unindexed full-table scans every ~30s match a new analytics dashboard client.',
            glossary: 'A full-table scan reads an entire table instead of using an index — expensive at scale.',
          },
          {
            id: 'db-m-2',
            kind: 'indicator',
            text: 'Read replicas are healthy at ~20% CPU.',
          },
        ],
        { highlight: true, indicatorHints: { dbLatency: 40 } },
      ),
      src('app-logs', 'Application logs', 5, [
        {
          id: 'db-l-1',
          kind: 'confirmed',
          text: 'App servers are timing out waiting for database connections.',
        },
      ]),
      src('deployments', 'Recent deployments', 4, [
        {
          id: 'db-d-1',
          kind: 'assumption',
          text: 'No production deploy in the last hour — this may be a noisy client, not a release bug.',
        },
      ]),
      src('customer-reports', 'Customer reports', 3, [
        {
          id: 'db-c-1',
          kind: 'indicator',
          text: 'Users report the whole site feeling slow, not just one page.',
        },
      ]),
    ],
  },

  'payment-outage': {
    customerImpact: 'Orders are not completing — carts fill but payments fail.',
    initialEvidence: [
      {
        id: 'pay-alert',
        kind: 'confirmed',
        text: 'Payment provider is returning 503 for charge attempts; their status page shows an incident.',
      },
    ],
    keyIndicators: ['errorRate', 'revenueLoss', 'trust', 'requestVolume'],
    investigations: [
      src(
        'status-page',
        'Status-page history',
        4,
        [
          {
            id: 'pay-s-1',
            kind: 'confirmed',
            text: 'Vendor status: investigating elevated errors, no ETA posted.',
            glossary: 'A status page is where a vendor publicly reports outages.',
          },
        ],
        { highlight: true },
      ),
      src('app-logs', 'Application logs', 5, [
        {
          id: 'pay-l-1',
          kind: 'confirmed',
          text: '100% of charge attempts fail upstream; our code path is otherwise healthy.',
        },
      ]),
      src('customer-reports', 'Customer reports', 4, [
        {
          id: 'pay-c-1',
          kind: 'indicator',
          text: 'Customers see generic payment errors with no explanation.',
        },
      ]),
      src('deployments', 'Recent deployments', 3, [
        {
          id: 'pay-d-1',
          kind: 'indicator',
          text: 'A secondary payment provider exists but is only validated in two markets.',
        },
      ]),
    ],
  },

  'ssl-expired': {
    customerImpact: 'Browsers and mobile apps are blocking API access with security warnings.',
    initialEvidence: [
      {
        id: 'ssl-alert',
        kind: 'confirmed',
        text: 'TLS handshake failing: certificate for api.example.com expired 22 minutes ago.',
      },
    ],
    keyIndicators: ['errorRate', 'trust', 'revenueLoss', 'requestVolume'],
    investigations: [
      src(
        'network',
        'Network / TLS checks',
        5,
        [
          {
            id: 'ssl-n-1',
            kind: 'confirmed',
            text: 'Certificate expired; auto-renewal job has been failing silently for ~60 days.',
            glossary: 'TLS certificates prove a site’s identity and encrypt traffic.',
          },
        ],
        { highlight: true },
      ),
      src('app-logs', 'Application logs', 4, [
        {
          id: 'ssl-l-1',
          kind: 'indicator',
          text: 'Mobile clients fail closed — hard errors, no fallback to insecure HTTP.',
        },
      ]),
      src('deployments', 'Recent deployments', 3, [
        {
          id: 'ssl-d-1',
          kind: 'assumption',
          text: 'A parent-domain wildcard cert is valid, but some apps may pin the exact certificate.',
        },
      ]),
      src('customer-reports', 'Customer reports', 3, [
        {
          id: 'ssl-c-1',
          kind: 'indicator',
          text: 'Screenshots of the expired-cert warning are already appearing in support tickets.',
        },
      ]),
    ],
  },

  'traffic-spike': {
    customerImpact: 'The site is slow during a viral traffic surge — potential new customers are bouncing.',
    initialEvidence: [
      {
        id: 'ts-alert',
        kind: 'confirmed',
        text: 'Request volume is ~11x baseline after a viral social post; autoscaling is at its max.',
      },
    ],
    keyIndicators: ['requestVolume', 'cpu', 'dbLatency', 'revenueLoss'],
    investigations: [
      src(
        'network',
        'Network traffic',
        5,
        [
          {
            id: 'ts-n-1',
            kind: 'confirmed',
            text: 'Most traffic hits landing and product pages; CDN cache hit ratio is only 32%.',
            glossary: 'A CDN caches content closer to users so your origin servers do less work.',
          },
        ],
        { highlight: true, indicatorHints: { requestVolume: 20 } },
      ),
      src('db-metrics', 'Database metrics', 4, [
        {
          id: 'ts-d-1',
          kind: 'indicator',
          text: 'Database latency rising as dynamic page renders increase.',
        },
      ]),
      src('customer-reports', 'Customer reports', 3, [
        {
          id: 'ts-c-1',
          kind: 'indicator',
          text: 'New visitors complain about multi-second page loads.',
        },
      ]),
      src('app-logs', 'Application logs', 4, [
        {
          id: 'ts-l-1',
          kind: 'assumption',
          text: 'Traffic looks legitimate (browsers, not obvious bots) — still unconfirmed for all paths.',
        },
      ]),
    ],
  },

  'memory-leak': {
    customerImpact: 'No customer impact yet, but a memory leak will cause outages during tonight’s peak if ignored.',
    initialEvidence: [
      {
        id: 'ml-alert',
        kind: 'confirmed',
        text: 'API fleet memory has climbed steadily since release 3.9.0; OOM risk within ~2 hours.',
      },
    ],
    keyIndicators: ['memory', 'health', 'cpu', 'errorRate'],
    investigations: [
      src(
        'deployments',
        'Recent deployments',
        5,
        [
          {
            id: 'ml-d-1',
            kind: 'confirmed',
            text: 'Release 3.9.0 added an unbounded in-memory cache — heap dumps point there.',
            glossary: 'A memory leak keeps allocating memory without releasing it until the process crashes.',
          },
        ],
        { highlight: true, indicatorHints: { memory: 10 } },
      ),
      src('app-logs', 'Application logs', 4, [
        {
          id: 'ml-l-1',
          kind: 'indicator',
          text: 'Error rate and latency are still normal — this is a slow burn, not a live outage.',
        },
      ]),
      src('db-metrics', 'Database metrics', 3, [
        {
          id: 'ml-db-1',
          kind: 'indicator',
          text: 'Database metrics are unchanged.',
        },
      ]),
      src('customer-reports', 'Customer reports', 2, [
        {
          id: 'ml-c-1',
          kind: 'unknown',
          text: 'No customer tickets yet related to this alert.',
        },
      ]),
    ],
  },

  'cache-invalidation': {
    customerImpact: 'Some customers see wrong prices at checkout; a few underpriced orders already completed.',
    initialEvidence: [
      {
        id: 'ci-alert',
        kind: 'confirmed',
        text: 'Pricing cache is serving stale entries after last night’s catalog import.',
      },
    ],
    keyIndicators: ['errorRate', 'trust', 'revenueLoss', 'dbLatency'],
    investigations: [
      src(
        'cache',
        'Cache metrics',
        5,
        [
          {
            id: 'ci-c-1',
            kind: 'confirmed',
            text: '~40% of cached prices in the catalog namespace were not invalidated after import.',
            glossary: 'Cache invalidation removes outdated cached data so fresh values are loaded.',
          },
        ],
        { highlight: true },
      ),
      src('db-metrics', 'Database metrics', 4, [
        {
          id: 'ci-d-1',
          kind: 'confirmed',
          text: 'Database prices are correct — the bug is in the cache layer, not source data.',
        },
      ]),
      src('customer-reports', 'Customer reports', 4, [
        {
          id: 'ci-cust-1',
          kind: 'indicator',
          text: 'Shoppers report promotional prices that should have ended last week.',
        },
      ]),
      src('deployments', 'Recent deployments', 3, [
        {
          id: 'ci-dep-1',
          kind: 'assumption',
          text: 'Flushing the entire cache would refresh data but may stampede the database.',
        },
      ]),
    ],
  },

  'region-outage': {
    customerImpact: 'Large parts of the product are unreachable for users routed through the primary region.',
    initialEvidence: [
      {
        id: 'ro-alert',
        kind: 'confirmed',
        text: 'Cloud provider reports degraded EC2/EBS in your primary region; ~60% of capacity unreachable.',
      },
    ],
    keyIndicators: ['errorRate', 'health', 'revenueLoss', 'requestVolume'],
    investigations: [
      src(
        'status-page',
        'Status-page history',
        4,
        [
          {
            id: 'ro-s-1',
            kind: 'confirmed',
            text: 'Provider incident open with no ETA. Standby region is warm with replicated data.',
            glossary: 'A warm standby is a backup region kept partly ready for failover.',
          },
        ],
        { highlight: true },
      ),
      src('network', 'Network traffic', 5, [
        {
          id: 'ro-n-1',
          kind: 'indicator',
          text: 'Surviving capacity is overloaded as traffic concentrates on healthy zones.',
        },
      ]),
      src('db-metrics', 'Database metrics', 5, [
        {
          id: 'ro-d-1',
          kind: 'confirmed',
          text: 'Replication lag to standby is a few seconds — failover looks viable.',
        },
      ]),
      src('deployments', 'Recent deployments', 3, [
        {
          id: 'ro-dep-1',
          kind: 'assumption',
          text: 'Last full failover test was seven months ago — expect some config drift.',
        },
      ]),
    ],
  },

  'credential-leak': {
    customerImpact: 'No confirmed customer impact yet, but exposed credentials can turn into a major breach quickly.',
    initialEvidence: [
      {
        id: 'cl-alert',
        kind: 'confirmed',
        text: 'Live AWS access key and database password found in a public GitHub repo (pushed 43 minutes ago).',
      },
    ],
    keyIndicators: ['trust', 'health', 'errorRate', 'revenueLoss'],
    investigations: [
      src(
        'auth-logs',
        'Authentication / CloudTrail',
        6,
        [
          {
            id: 'cl-a-1',
            kind: 'confirmed',
            text: 'Key has broad S3/EC2 permissions. CloudTrail shows no abuse yet — scrapers often arrive within minutes.',
            glossary: 'Rotating a credential replaces it so the old leaked value stops working.',
          },
        ],
        { highlight: true },
      ),
      src('deployments', 'Recent deployments', 3, [
        {
          id: 'cl-d-1',
          kind: 'indicator',
          text: 'Secret was pushed from an intern’s personal fork of an internal repo.',
        },
      ]),
      src('app-logs', 'Application logs', 3, [
        {
          id: 'cl-l-1',
          kind: 'unknown',
          text: 'No application errors tied to this finding yet.',
        },
      ]),
      src('customer-reports', 'Customer reports', 2, [
        {
          id: 'cl-c-1',
          kind: 'unknown',
          text: 'No public disclosure or customer reports so far.',
        },
      ]),
    ],
  },

  'rate-limit-outage': {
    customerImpact: 'Password resets and receipts are delayed; marketing email is stuck behind a retry storm.',
    initialEvidence: [
      {
        id: 'rl-alert',
        kind: 'confirmed',
        text: 'Email provider returning 429s; retry logic has no backoff and is doubling traffic.',
      },
    ],
    keyIndicators: ['errorRate', 'requestVolume', 'cpu', 'trust'],
    investigations: [
      src(
        'app-logs',
        'Application logs',
        5,
        [
          {
            id: 'rl-l-1',
            kind: 'confirmed',
            text: 'Bulk campaign hit the plan limit; retries without jitter created a self-inflicted flood.',
            glossary: 'Backoff with jitter spaces out retries so you do not hammer a failing dependency.',
          },
        ],
        { highlight: true, indicatorHints: { requestVolume: 15 } },
      ),
      src('status-page', 'Status-page history', 3, [
        {
          id: 'rl-s-1',
          kind: 'indicator',
          text: 'Email vendor status is green — this is your traffic pattern, not their outage.',
        },
      ]),
      src('customer-reports', 'Customer reports', 4, [
        {
          id: 'rl-c-1',
          kind: 'indicator',
          text: 'Users cannot reset passwords; support volume rising.',
        },
      ]),
      src('network', 'Network traffic', 4, [
        {
          id: 'rl-n-1',
          kind: 'confirmed',
          text: 'Outbound notification traffic is the dominant spike.',
        },
      ]),
    ],
  },

  'config-corruption': {
    customerImpact: 'Running services still work, but anything that restarts may fail — capacity cannot heal or scale.',
    initialEvidence: [
      {
        id: 'cc-alert',
        kind: 'confirmed',
        text: 'Malformed YAML merged to the central config repo; cluster sync is failing for new pods.',
      },
    ],
    keyIndicators: ['errorRate', 'health', 'cpu', 'requestVolume'],
    investigations: [
      src(
        'deployments',
        'Recent deployments / config git',
        6,
        [
          {
            id: 'cc-d-1',
            kind: 'confirmed',
            text: 'Bad commit identified; two later commits are stacked on top. Running pods still use old config.',
            glossary: 'Declarative config in git means you can revert to a known-good state.',
          },
        ],
        { highlight: true },
      ),
      src('app-logs', 'Application logs', 4, [
        {
          id: 'cc-l-1',
          kind: 'indicator',
          text: 'Any pod that restarts fails to boot against the broken config.',
        },
      ]),
      src('network', 'Network traffic', 3, [
        {
          id: 'cc-n-1',
          kind: 'indicator',
          text: 'Live traffic still flows on pods that have not restarted.',
        },
      ]),
      src('customer-reports', 'Customer reports', 2, [
        {
          id: 'cc-c-1',
          kind: 'unknown',
          text: 'Customer impact is limited so far but will grow with natural pod churn.',
        },
      ]),
    ],
  },

  ddos: {
    customerImpact: 'Legitimate users are timing out while junk traffic saturates the origin.',
    initialEvidence: [
      {
        id: 'ddos-alert',
        kind: 'confirmed',
        text: 'Inbound traffic ~40x baseline from thousands of IPs; junk POSTs targeting /api/search.',
      },
    ],
    keyIndicators: ['requestVolume', 'cpu', 'errorRate', 'revenueLoss'],
    investigations: [
      src(
        'network',
        'Network traffic',
        5,
        [
          {
            id: 'ddos-n-1',
            kind: 'confirmed',
            text: 'Distributed junk POSTs with randomized payloads. CDN/WAF is in front but challenge rules are off.',
            glossary: 'A WAF (web application firewall) can challenge or block abusive traffic at the edge.',
          },
        ],
        { highlight: true, indicatorHints: { requestVolume: 30, cpu: 10 } },
      ),
      src('app-logs', 'Application logs', 4, [
        {
          id: 'ddos-l-1',
          kind: 'indicator',
          text: 'Origin CPU saturated; search endpoint dominates expensive work.',
        },
      ]),
      src('db-metrics', 'Database metrics', 4, [
        {
          id: 'ddos-d-1',
          kind: 'indicator',
          text: 'Database latency rising as origin fans out under load.',
        },
      ]),
      src('customer-reports', 'Customer reports', 3, [
        {
          id: 'ddos-c-1',
          kind: 'indicator',
          text: 'Users report timeouts; attack does not look like normal browsing.',
        },
      ]),
    ],
  },
};

export function getIncidentBrief(incidentId: string): IncidentBrief {
  const brief = INCIDENT_BRIEFS[incidentId];
  if (!brief) {
    throw new Error(`Missing incident brief for ${incidentId}`);
  }
  return brief;
}
