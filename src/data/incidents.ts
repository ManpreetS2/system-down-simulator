import type { Incident } from '../types';

/**
 * The incident catalog. All gameplay content lives here — components never
 * hard-code outcomes. Score guide: clean best-practice plays land 90–120,
 * decent plays 55–85, lucky gambles up to 130, failures -25 to -70,
 * timeouts around -80.
 */
export const INCIDENTS: Incident[] = [
  {
    id: 'failed-deploy',
    title: 'Failed Production Deployment',
    severity: 'SEV1',
    category: 'Deployment',
    alert:
      'PagerDuty · checkout-service · Deploy #4821 failing health checks — 5xx rate 34% and climbing. 3 of 12 pods in CrashLoopBackOff.',
    symptoms: [
      'Error rate jumped from 0.4% to 34% two minutes after deploy #4821 went out',
      'New pods crash on startup with a missing environment variable',
      'Checkout conversion dropping in real time',
      'Old pods still healthy but being drained by the rollout',
    ],
    impact: { errorRate: 33, cpu: 12, requestVolume: -8 },
    revenueLossPerMin: 4200,
    healthDrainPerSec: 0.09,
    trustDrainPerSec: 0.05,
    recommended:
      'Roll back first, debug second. A failed deploy with a known-good previous version is the easiest incident to reverse — restore service, then reproduce the config issue in staging.',
    actions: [
      {
        id: 'rollback',
        label: 'Roll back to the previous release',
        detail: 'Trigger the automated rollback to deploy #4820. Takes a few minutes, loses the new feature.',
        risk: 'low',
        focus: 'safety',
        timeCostMin: 4,
        successChance: 1,
        success: {
          quality: 'success',
          score: 110,
          effects: { health: 6, trust: 2, revenue: 9000, budget: 0 },
          explanation:
            'Textbook response. The previous release was known-good, so rolling back restored checkout in minutes. The broken config can now be fixed calmly in staging instead of live.',
        },
      },
      {
        id: 'hotfix',
        label: 'Hotfix the env var live',
        detail: 'Patch the missing variable directly into the running deployment and restart pods.',
        risk: 'high',
        focus: 'speed',
        timeCostMin: 2,
        successChance: 0.55,
        success: {
          quality: 'success',
          score: 120,
          effects: { health: 5, trust: 2, revenue: 12000, budget: 0 },
          explanation:
            'The gamble paid off — the missing variable was the only defect, and patching it live restored service faster than a rollback. Risky, but this time the diagnosis was right.',
        },
        failure: {
          quality: 'failure',
          score: -45,
          effects: { health: -10, trust: -6, revenue: -14000, budget: 0 },
          explanation:
            'The env var was only the first failure. The new release also shipped a broken database migration flag, so the hotfixed pods crashed differently and the outage stretched on. Live-editing production state during an incident compounds risk.',
        },
      },
      {
        id: 'scale-old',
        label: 'Freeze rollout and scale up old pods',
        detail: 'Pause the deployment, keep traffic on the healthy old version, investigate offline. Costs extra capacity.',
        risk: 'low',
        focus: 'cost',
        timeCostMin: 6,
        successChance: 1,
        success: {
          quality: 'success',
          score: 85,
          effects: { health: 4, trust: 1, revenue: 4000, budget: -6000 },
          explanation:
            'Safe and steady. Freezing the rollout stopped the bleeding, though paying for double capacity while investigating was slower and pricier than a straight rollback.',
        },
      },
      {
        id: 'debug-live',
        label: 'Debug the crashing pods first',
        detail: 'Shell into the failing pods and diagnose the root cause before touching the rollout.',
        risk: 'medium',
        focus: 'safety',
        timeCostMin: 12,
        successChance: 1,
        success: {
          quality: 'partial',
          score: 25,
          effects: { health: -4, trust: -4, revenue: -9000, budget: 0 },
          explanation:
            'You found the root cause — but customers kept hitting errors for twelve minutes while you read stack traces. Diagnosis is valuable, but during a SEV1 the priority is restoring service, not understanding it.',
        },
      },
    ],
    timeout: {
      quality: 'failure',
      score: -80,
      effects: { health: -16, trust: -12, revenue: -26000, budget: 0 },
      explanation:
        'No response was made in time. The rollout finished draining the healthy pods, checkout went fully down, and the on-call backup had to roll back for you.',
    },
  },
  {
    id: 'db-overload',
    title: 'Primary Database Overloaded',
    severity: 'SEV1',
    category: 'Database',
    alert:
      'Datadog · postgres-primary · CPU 97%, connection pool exhausted (500/500). p99 query latency 8.4s. App servers timing out.',
    symptoms: [
      'A new analytics dashboard is issuing unindexed full-table scans every 30 seconds',
      'Connection pool saturated; user requests queuing behind analytics queries',
      'Read replicas healthy at 20% CPU',
      'Page loads timing out across the product',
    ],
    impact: { dbLatency: 620, cpu: 45, errorRate: 14 },
    revenueLossPerMin: 3600,
    healthDrainPerSec: 0.08,
    trustDrainPerSec: 0.04,
    recommended:
      'Kill the offending queries and shift reads to the replicas. Identify the noisy client, block it, then fix indexing later. Restarting a hot primary is almost never the right first move.',
    actions: [
      {
        id: 'kill-queries',
        label: 'Kill the runaway queries',
        detail: 'Terminate the analytics scans and block that client at the pooler.',
        risk: 'low',
        focus: 'speed',
        timeCostMin: 3,
        successChance: 1,
        success: {
          quality: 'success',
          score: 115,
          effects: { health: 7, trust: 2, revenue: 8000, budget: 0 },
          explanation:
            'Exactly right. The scans were the load, so killing them freed the pool instantly. Blocking the client stopped recurrence, and the dashboard team gets an indexing ticket instead of prod access.',
        },
      },
      {
        id: 'restart-db',
        label: 'Restart the primary database',
        detail: 'Bounce postgres-primary to clear all connections. Fast, blunt, briefly takes everything down.',
        risk: 'high',
        focus: 'speed',
        timeCostMin: 2,
        successChance: 0.4,
        success: {
          quality: 'partial',
          score: 40,
          effects: { health: -2, trust: -2, revenue: -4000, budget: 0 },
          explanation:
            'The restart cleared the pool and you got lucky: the analytics job happened to be paused when it came back. But the root cause is untouched, and you took the whole product down for ninety seconds to clear one bad client.',
        },
        failure: {
          quality: 'failure',
          score: -55,
          effects: { health: -12, trust: -8, revenue: -16000, budget: 0 },
          explanation:
            'The restart caused a full outage — and the moment the database came back, the analytics job reconnected and saturated it again. Restarting a database under load treats the symptom while guaranteeing downtime.',
        },
      },
      {
        id: 'scale-db',
        label: 'Emergency-upgrade the instance',
        detail: 'Resize the primary to the next tier. Expensive, requires a brief failover.',
        risk: 'medium',
        focus: 'cost',
        timeCostMin: 9,
        successChance: 1,
        success: {
          quality: 'partial',
          score: 35,
          effects: { health: 1, trust: -1, revenue: -3000, budget: -14000 },
          explanation:
            'The bigger instance absorbed the bad queries, but you paid a large recurring bill to outrun a missing index. Capacity is a poor substitute for fixing the query — the scans will grow with the data.',
          delayed: {
            message:
              'Delayed fallout from “Primary Database Overloaded”: the unindexed analytics scans grew with the data and began degrading the upsized instance too. The indexing fix had to happen anyway.',
            effects: { health: -4, trust: -1, revenue: -4000, budget: 0 },
            score: -15,
          },
        },
      },
      {
        id: 'route-replicas',
        label: 'Shift read traffic to replicas',
        detail: 'Repoint read queries at the healthy replicas to relieve the primary.',
        risk: 'medium',
        focus: 'safety',
        timeCostMin: 6,
        successChance: 1,
        success: {
          quality: 'success',
          score: 80,
          effects: { health: 4, trust: 1, revenue: 3000, budget: -2000 },
          explanation:
            'Solid mitigation — user reads recovered as the replicas took the load. The analytics scans still hammer the primary, so someone must still kill them, but customers stopped feeling it.',
        },
      },
    ],
    timeout: {
      quality: 'failure',
      score: -80,
      effects: { health: -15, trust: -11, revenue: -22000, budget: 0 },
      explanation:
        'No response was made in time. The connection pool stayed saturated until the app tier fell over, and the database team had to intervene from outside the on-call rotation.',
    },
  },
  {
    id: 'payment-outage',
    title: 'Payment Provider Outage',
    severity: 'SEV1',
    category: 'Third-Party',
    alert:
      'Sentry · payments-api · Upstream provider returning 503 for 100% of charge attempts. Provider status page: "Investigating elevated errors."',
    symptoms: [
      'Every card charge failing with provider-side 503s since 14:02',
      'Provider status page acknowledges an incident, no ETA',
      'Carts are filling but zero orders completing',
      'A secondary payment provider is integrated but only used in two markets',
    ],
    impact: { errorRate: 22, requestVolume: 6 },
    revenueLossPerMin: 5200,
    healthDrainPerSec: 0.05,
    trustDrainPerSec: 0.07,
    recommended:
      'Fail over to the secondary provider where supported, and queue failed charges for automatic retry everywhere else. You cannot fix a vendor — design around them and communicate with customers.',
    actions: [
      {
        id: 'failover-provider',
        label: 'Fail over to the backup provider',
        detail: 'Route all charge traffic to the secondary provider, including markets where it is untested.',
        risk: 'high',
        focus: 'speed',
        timeCostMin: 5,
        successChance: 0.6,
        success: {
          quality: 'success',
          score: 125,
          effects: { health: 3, trust: 5, revenue: 18000, budget: -3000 },
          explanation:
            'Bold and it worked — the backup provider handled the full load and untested markets processed cleanly. Revenue kept flowing through a vendor outage most competitors just ate.',
        },
        failure: {
          quality: 'failure',
          score: -40,
          effects: { health: -6, trust: -9, revenue: -12000, budget: -3000 },
          explanation:
            'The backup provider rejected transactions in the untested markets due to missing currency configuration, and some customers were double-charged during the cutover. Failing over to an unvalidated path traded one outage for a messier one.',
        },
      },
      {
        id: 'queue-retry',
        label: 'Queue charges for automatic retry',
        detail: 'Accept orders, store payment intents, and retry automatically when the provider recovers.',
        risk: 'low',
        focus: 'customer',
        timeCostMin: 7,
        successChance: 1,
        success: {
          quality: 'success',
          score: 105,
          effects: { health: 2, trust: 6, revenue: 11000, budget: -1000 },
          explanation:
            'Excellent customer-first play. Shoppers completed checkout without noticing, and the queued charges processed when the vendor recovered. Slightly slower revenue, near-zero customer pain.',
        },
      },
      {
        id: 'wait-vendor',
        label: 'Wait for the vendor to recover',
        detail: 'Monitor the status page and hold position. Costs nothing, does nothing.',
        risk: 'medium',
        focus: 'cost',
        timeCostMin: 14,
        successChance: 1,
        success: {
          quality: 'failure',
          score: -30,
          effects: { health: -3, trust: -7, revenue: -20000, budget: 0 },
          explanation:
            'The vendor took most of an hour to recover, and every abandoned cart in that window was lost revenue and lost trust. "Wait and see" is a decision too — usually the most expensive one.',
        },
      },
      {
        id: 'banner-comms',
        label: 'Post a status banner and pause checkout',
        detail: 'Tell customers payments are degraded, disable the buy button, email affected users.',
        risk: 'low',
        focus: 'customer',
        timeCostMin: 6,
        successChance: 1,
        success: {
          quality: 'partial',
          score: 55,
          effects: { health: 1, trust: 4, revenue: -8000, budget: 0 },
          explanation:
            'Honest communication protected trust — customers forgive outages they are told about. But pausing checkout entirely forfeited revenue that queuing or failover could have saved.',
        },
      },
    ],
    timeout: {
      quality: 'failure',
      score: -80,
      effects: { health: -8, trust: -14, revenue: -30000, budget: 0 },
      explanation:
        'No response was made in time. Customers hit raw payment errors for the entire vendor outage with no banner, no retries, and no failover. Support tickets tripled.',
    },
  },
  {
    id: 'ssl-expired',
    title: 'Expired SSL Certificate',
    severity: 'SEV2',
    category: 'Security',
    alert:
      'Uptime-bot · api.example.com · TLS handshake failing: certificate expired 22 minutes ago. Mobile apps and integrations rejecting connections.',
    symptoms: [
      'Browsers showing full-page security warnings on the API domain',
      'Mobile apps failing closed — hard errors, no fallback',
      'The auto-renewal job has been silently failing for 60 days',
      'A wildcard cert for the parent domain is valid and unexpired',
    ],
    impact: { errorRate: 18, requestVolume: -25 },
    revenueLossPerMin: 2800,
    healthDrainPerSec: 0.06,
    trustDrainPerSec: 0.06,
    recommended:
      'Issue a fresh certificate immediately — modern CAs take minutes. Then fix and alert on the renewal automation, because a silently failing cron job is the real incident.',
    actions: [
      {
        id: 'reissue',
        label: 'Issue a new certificate now',
        detail: 'Request a fresh cert from the CA and deploy it to the load balancers.',
        risk: 'low',
        focus: 'speed',
        timeCostMin: 5,
        successChance: 1,
        success: {
          quality: 'success',
          score: 110,
          effects: { health: 6, trust: 3, revenue: 6000, budget: 0 },
          explanation:
            'Clean resolution. Automated issuance took minutes, the new cert deployed everywhere, and you flagged the dead renewal job for a permanent fix with monitoring.',
        },
      },
      {
        id: 'wildcard',
        label: 'Swap in the parent wildcard cert',
        detail: 'Reuse the valid wildcard certificate from the parent domain as a stopgap.',
        risk: 'medium',
        focus: 'speed',
        timeCostMin: 3,
        successChance: 0.7,
        success: {
          quality: 'partial',
          score: 60,
          effects: { health: 4, trust: 1, revenue: 4000, budget: 0 },
          explanation:
            'It worked as a stopgap — the wildcard covered the API host and traffic recovered fast. But now one key protects every subdomain, which widens the blast radius of any future key compromise. Fine for an hour, not for a quarter.',
          delayed: {
            message:
              'Delayed fallout from “Expired SSL Certificate”: the security review flagged the shared wildcard key on a public API host and required an urgent dedicated re-issuance and key rotation.',
            effects: { health: 0, trust: -2, revenue: 0, budget: -4000 },
            score: -10,
          },
        },
        failure: {
          quality: 'failure',
          score: -35,
          effects: { health: -6, trust: -5, revenue: -8000, budget: 0 },
          explanation:
            'Several mobile app versions pin the exact certificate, not the domain — the wildcard swap broke them harder than the expiry did. Cert pinning is exactly why stopgap swaps need a compatibility check first.',
        },
      },
      {
        id: 'disable-tls',
        label: 'Temporarily serve over plain HTTP',
        detail: 'Redirect API traffic to an HTTP endpoint until a cert is sorted out.',
        risk: 'high',
        focus: 'speed',
        timeCostMin: 2,
        successChance: 0.25,
        success: {
          quality: 'partial',
          score: 10,
          effects: { health: 1, trust: -3, revenue: 2000, budget: 0 },
          explanation:
            'Traffic technically flowed, but you sent customer data — including auth tokens — in cleartext. Nothing bad happened this time, which is luck, not engineering. This option should not exist.',
        },
        failure: {
          quality: 'failure',
          score: -70,
          effects: { health: -8, trust: -14, revenue: -10000, budget: -5000 },
          explanation:
            'Clients with HSTS and pinned transport refused HTTP entirely, so availability barely improved — and a security researcher publicly flagged the unencrypted endpoint within the hour. Never trade transport security for uptime.',
        },
      },
      {
        id: 'fix-automation',
        label: 'Fix the renewal automation first',
        detail: 'Repair the broken renewal job so it re-issues correctly, then let it deploy the cert.',
        risk: 'medium',
        focus: 'safety',
        timeCostMin: 11,
        successChance: 1,
        success: {
          quality: 'partial',
          score: 45,
          effects: { health: 3, trust: -2, revenue: -4000, budget: 0 },
          explanation:
            'You fixed the real root cause — but customers stared at browser warnings for eleven extra minutes while you debugged a cron job. Mitigate first, then make it permanent. Order matters.',
        },
      },
    ],
    timeout: {
      quality: 'failure',
      score: -75,
      effects: { health: -10, trust: -12, revenue: -18000, budget: 0 },
      explanation:
        'No response was made in time. The security warnings sat on every client for the full window; screenshots of the expired cert circulated on social media before anyone acted.',
    },
  },
  {
    id: 'traffic-spike',
    title: 'Viral Traffic Spike',
    severity: 'SEV2',
    category: 'Traffic',
    alert:
      'CloudWatch · web-frontend · Request volume 11x baseline in 8 minutes after a viral social post. Autoscaling at max. p95 latency 6s and rising.',
    symptoms: [
      'A viral post is driving 11x normal traffic, mostly to the landing and product pages',
      'Autoscaling group pinned at its configured maximum',
      'CDN cache hit ratio only 32% — most pages rendered dynamically',
      'This is the best acquisition moment the company has ever had',
    ],
    impact: { cpu: 48, requestVolume: 95, dbLatency: 130 },
    revenueLossPerMin: 3000,
    healthDrainPerSec: 0.07,
    trustDrainPerSec: 0.03,
    recommended:
      'Raise cache TTLs and static-render the hot pages first — it is the cheapest, fastest lever and usually absorbs most of a read-heavy spike. Raise scaling limits as a second step if needed.',
    actions: [
      {
        id: 'raise-limits',
        label: 'Raise autoscaling limits',
        detail: 'Double the instance cap and let the fleet grow into the demand. Costs real money.',
        risk: 'low',
        focus: 'customer',
        timeCostMin: 5,
        successChance: 1,
        success: {
          quality: 'success',
          score: 90,
          effects: { health: 4, trust: 4, revenue: 14000, budget: -12000 },
          explanation:
            'It worked — the fleet grew, latency recovered, and the viral moment converted into signups. The cloud bill stings, but capacity during peak demand usually pays for itself.',
        },
      },
      {
        id: 'cache-first',
        label: 'Aggressively cache the hot pages',
        detail: 'Push the landing and product pages to the CDN with long TTLs, serve static where possible.',
        risk: 'medium',
        focus: 'cost',
        timeCostMin: 7,
        successChance: 0.8,
        success: {
          quality: 'success',
          score: 120,
          effects: { health: 6, trust: 4, revenue: 15000, budget: -1000 },
          explanation:
            'The highest-leverage move. Cache hit ratio jumped to 94%, origin load collapsed, and the spike was absorbed for pocket change. Read-heavy spikes are cache problems, not capacity problems.',
        },
        failure: {
          quality: 'partial',
          score: 30,
          effects: { health: 0, trust: 0, revenue: 2000, budget: -2000 },
          explanation:
            'Caching helped the landing page, but logged-in and personalized pages could not be cached and kept hammering the origin. Partial relief — you still had to add capacity behind it.',
        },
      },
      {
        id: 'rate-limit',
        label: 'Rate-limit incoming traffic',
        detail: 'Throttle requests at the edge to protect the backend. Some visitors get turned away.',
        risk: 'medium',
        focus: 'safety',
        timeCostMin: 4,
        successChance: 1,
        success: {
          quality: 'partial',
          score: 40,
          effects: { health: 5, trust: -4, revenue: -6000, budget: 0 },
          explanation:
            'The backend stabilized, but you turned away thousands of first-time visitors during the company’s biggest organic moment. Protecting systems by rejecting customers is a last resort, not a first move.',
        },
      },
      {
        id: 'do-nothing-spike',
        label: 'Ride it out at current capacity',
        detail: 'The spike might pass on its own. Keep watching the graphs.',
        risk: 'high',
        focus: 'cost',
        timeCostMin: 10,
        successChance: 0.2,
        success: {
          quality: 'partial',
          score: 20,
          effects: { health: -3, trust: -2, revenue: 3000, budget: 0 },
          explanation:
            'The post fell off the feed and traffic receded before anything fell over. You saved money by gambling with availability during a growth moment — it happened to work, but the odds were bad.',
        },
        failure: {
          quality: 'failure',
          score: -50,
          effects: { health: -13, trust: -8, revenue: -16000, budget: 0 },
          explanation:
            'The overloaded app tier started timing out on database connections and the site collapsed under the spike. Thousands of curious new visitors met an error page. Hope is not a scaling strategy.',
        },
      },
    ],
    timeout: {
      quality: 'failure',
      score: -75,
      effects: { health: -14, trust: -9, revenue: -20000, budget: 0 },
      explanation:
        'No response was made in time. The site buckled at peak virality and the moment passed with the front page unreachable.',
    },
  },
  {
    id: 'memory-leak',
    title: 'Memory Leak in API Fleet',
    severity: 'SEV3',
    category: 'Infrastructure',
    alert:
      'Grafana · api-fleet · Memory climbing linearly on all nodes since release 3.9.0 (6h ago). First OOM-kill projected within ~2 hours.',
    symptoms: [
      'Heap usage growing ~4% per hour on every node since release 3.9.0',
      'No customer impact yet; latency and error rates normal',
      'Heap dumps point at an unbounded in-memory cache added in the release',
      'Projection: nodes begin OOM-killing during tonight’s peak window',
    ],
    impact: { memory: 34, cpu: 6 },
    revenueLossPerMin: 900,
    healthDrainPerSec: 0.03,
    trustDrainPerSec: 0.01,
    recommended:
      'You have runway — use it. Start a rolling restart to reset the clock, then ship the cache-bound fix calmly before peak. Slow-burn incidents reward the patient, not the dramatic.',
    actions: [
      {
        id: 'rolling-restart',
        label: 'Rolling restart, then fix properly',
        detail: 'Restart nodes in waves to reclaim memory, and schedule the real fix before peak.',
        risk: 'low',
        focus: 'safety',
        timeCostMin: 8,
        successChance: 1,
        success: {
          quality: 'success',
          score: 105,
          effects: { health: 6, trust: 1, revenue: 3000, budget: 0 },
          explanation:
            'Measured and correct. The restart bought hours of runway with zero customer impact, and the bounded-cache fix shipped before peak. This is what "calm under pressure" looks like.',
        },
      },
      {
        id: 'rollback-39',
        label: 'Roll back release 3.9.0',
        detail: 'Revert the whole release, including three features the growth team launched with it.',
        risk: 'medium',
        focus: 'safety',
        timeCostMin: 6,
        successChance: 1,
        success: {
          quality: 'partial',
          score: 60,
          effects: { health: 5, trust: 0, revenue: -4000, budget: 0 },
          explanation:
            'It stopped the leak, but reverting the whole release also pulled three working features mid-campaign. With hours of runway available, a full rollback was a bigger hammer than the problem needed.',
        },
      },
      {
        id: 'hot-patch-leak',
        label: 'Push an untested cache-limit patch now',
        detail: 'Write the fix live and deploy straight to production within the hour.',
        risk: 'high',
        focus: 'speed',
        timeCostMin: 4,
        successChance: 0.5,
        success: {
          quality: 'success',
          score: 95,
          effects: { health: 6, trust: 1, revenue: 3000, budget: 0 },
          explanation:
            'The patch was correct and the leak flattened immediately. Skipping review on a two-line bound was a gamble that happened to pay — with two hours of runway, the restart-then-review path had the same result at zero risk.',
        },
        failure: {
          quality: 'failure',
          score: -40,
          effects: { health: -8, trust: -4, revenue: -9000, budget: 0 },
          explanation:
            'The rushed patch had an off-by-one that evicted the entire cache continuously, spiking database load and causing the customer impact you were trying to prevent. Untested code during an incident creates incidents.',
        },
      },
      {
        id: 'add-memory',
        label: 'Resize the fleet with more memory',
        detail: 'Swap every node to a larger instance type to extend the runway.',
        risk: 'low',
        focus: 'cost',
        timeCostMin: 10,
        successChance: 1,
        success: {
          quality: 'partial',
          score: 30,
          effects: { health: 2, trust: 0, revenue: 0, budget: -11000 },
          explanation:
            'More memory just moves the OOM deadline; a leak fills any container eventually. You paid a permanent instance bill for a few extra hours of the same problem.',
        },
      },
    ],
    timeout: {
      quality: 'failure',
      score: -70,
      effects: { health: -12, trust: -7, revenue: -14000, budget: 0 },
      explanation:
        'No response was made in time. The leak ran until nodes OOM-killed in a rolling wave during peak — a slow, avoidable incident became a fast, real one.',
    },
  },
  {
    id: 'cache-invalidation',
    title: 'Bad Cache Invalidation',
    severity: 'SEV2',
    category: 'Data',
    alert:
      'Sentry · pricing-service · Customers reporting wrong prices at checkout. Cache layer serving stale entries after last night’s catalog import.',
    symptoms: [
      'The catalog import updated the database but failed to invalidate ~40% of cached prices',
      'Some customers see last week’s promotional prices at checkout',
      'A handful of orders already completed at incorrect (lower) prices',
      'Cache cluster is otherwise healthy under normal load',
    ],
    impact: { errorRate: 4, dbLatency: 40 },
    revenueLossPerMin: 2200,
    healthDrainPerSec: 0.04,
    trustDrainPerSec: 0.05,
    recommended:
      'Purge only the affected keys (the imported catalog namespace), honor the mispriced orders already placed, and add invalidation verification to the import job. A full cache flush self-inflicts a load spike.',
    actions: [
      {
        id: 'targeted-purge',
        label: 'Purge only the affected cache keys',
        detail: 'Invalidate the catalog namespace touched by the import; leave the rest of the cache warm.',
        risk: 'low',
        focus: 'safety',
        timeCostMin: 6,
        successChance: 1,
        success: {
          quality: 'success',
          score: 110,
          effects: { health: 5, trust: 3, revenue: 6000, budget: 0 },
          explanation:
            'Surgical and correct. The stale namespace refreshed from the database without a thundering herd, prices corrected within minutes, and the cache stayed warm for everything else.',
        },
      },
      {
        id: 'flush-all',
        label: 'Flush the entire cache',
        detail: 'Nuke every cached entry. Guaranteed fresh data — and a cold cache under live traffic.',
        risk: 'high',
        focus: 'speed',
        timeCostMin: 3,
        successChance: 0.45,
        success: {
          quality: 'partial',
          score: 45,
          effects: { health: -2, trust: 2, revenue: 2000, budget: 0 },
          explanation:
            'Prices corrected instantly and the database absorbed the cold-cache stampede — barely. It was off-peak; at peak traffic this same flush would have taken the site down.',
        },
        failure: {
          quality: 'failure',
          score: -50,
          effects: { health: -11, trust: -5, revenue: -13000, budget: 0 },
          explanation:
            'Every request became a cache miss at once and the resulting thundering herd overwhelmed the database. You fixed stale prices by causing a full slowdown. Flushes need to be scoped.',
        },
      },
      {
        id: 'disable-cache',
        label: 'Bypass the cache layer entirely',
        detail: 'Serve all pricing straight from the database until the import is verified.',
        risk: 'medium',
        focus: 'safety',
        timeCostMin: 5,
        successChance: 1,
        success: {
          quality: 'partial',
          score: 40,
          effects: { health: -3, trust: 2, revenue: -3000, budget: -3000 },
          explanation:
            'Prices were correct immediately, but the database ran hot serving uncached reads and page latency doubled until the purge was done anyway. The cache exists for a reason.',
        },
      },
      {
        id: 'honor-and-fix',
        label: 'Honor mispriced orders, purge quietly',
        detail: 'Let existing wrong-price orders stand, purge affected keys, email affected customers.',
        risk: 'low',
        focus: 'customer',
        timeCostMin: 8,
        successChance: 1,
        success: {
          quality: 'success',
          score: 95,
          effects: { health: 4, trust: 6, revenue: -2000, budget: 0 },
          explanation:
            'The customer-first version of the right answer. Honoring the mispriced orders cost a little revenue and bought a lot of goodwill — cheaper than the support storm and chargebacks of cancelling them.',
        },
      },
    ],
    timeout: {
      quality: 'failure',
      score: -75,
      effects: { health: -8, trust: -13, revenue: -19000, budget: 0 },
      explanation:
        'No response was made in time. Wrong prices ran all day, hundreds of underpriced orders accumulated, and the correction required a painful customer-communications cleanup.',
    },
  },
  {
    id: 'region-outage',
    title: 'Regional Cloud Outage',
    severity: 'SEV1',
    category: 'Cloud Provider',
    alert:
      'StatusCake · us-east-1 · Cloud provider reporting degraded EC2/EBS in your primary region. 60% of your capacity unreachable. Provider ETA: none.',
    symptoms: [
      'Primary region hosting 60% of capacity is degraded provider-side',
      'The standby region is warm: databases replicate there, app tier runs at minimal scale',
      'Last full failover test was seven months ago',
      'Latency-sensitive customers are already reporting timeouts',
    ],
    impact: { errorRate: 28, cpu: 30, dbLatency: 210, requestVolume: -15 },
    revenueLossPerMin: 4800,
    healthDrainPerSec: 0.1,
    trustDrainPerSec: 0.06,
    recommended:
      'Fail over to the standby region — that is exactly what it exists for. Scale it up first, verify replication lag, then shift traffic deliberately. Waiting out a provider outage with no ETA is gambling with someone else’s dice.',
    actions: [
      {
        id: 'failover-region',
        label: 'Execute the regional failover runbook',
        detail: 'Scale up the standby region, verify replication, shift DNS and traffic deliberately.',
        risk: 'medium',
        focus: 'safety',
        timeCostMin: 9,
        successChance: 0.85,
        success: {
          quality: 'success',
          score: 120,
          effects: { health: 8, trust: 5, revenue: 14000, budget: -9000 },
          explanation:
            'The runbook held. Replication was seconds behind, the standby scaled cleanly, and traffic shifted with only minutes of degradation. This is why warm standbys and failover tests exist.',
        },
        failure: {
          quality: 'partial',
          score: 25,
          effects: { health: -2, trust: -3, revenue: -8000, budget: -9000 },
          explanation:
            'The failover mostly worked, but seven months of drift meant two services had stale configs in the standby region and needed manual fixes mid-cutover. It ended well, slower and rougher than it should have — test your failovers.',
        },
      },
      {
        id: 'wait-provider',
        label: 'Wait for the provider to recover',
        detail: 'Run degraded on the remaining 40% capacity and trust the provider to fix it.',
        risk: 'high',
        focus: 'cost',
        timeCostMin: 15,
        successChance: 0.3,
        success: {
          quality: 'partial',
          score: 15,
          effects: { health: -4, trust: -3, revenue: -9000, budget: 0 },
          explanation:
            'The provider recovered in twenty minutes and you saved the failover effort. It was still a coin-flip with no ETA in hand — the downside was hours of half-capacity, and you had no control over which outcome you got.',
        },
        failure: {
          quality: 'failure',
          score: -60,
          effects: { health: -14, trust: -10, revenue: -24000, budget: 0 },
          explanation:
            'The provider outage stretched for hours. Your remaining capacity was crushed by full traffic, cascading into a complete outage — with a warm standby region sitting idle the entire time.',
        },
      },
      {
        id: 'shed-load',
        label: 'Shed non-critical load',
        detail: 'Disable heavy features (search, recommendations, exports) to fit traffic into surviving capacity.',
        risk: 'low',
        focus: 'speed',
        timeCostMin: 5,
        successChance: 1,
        success: {
          quality: 'partial',
          score: 65,
          effects: { health: 4, trust: -2, revenue: -5000, budget: 0 },
          explanation:
            'Graceful degradation worked: core flows survived on 40% capacity with heavy features dark. A good immediate move — but it is a bridge, and the failover still has to happen behind it.',
        },
      },
      {
        id: 'burst-single',
        label: 'Emergency-scale inside the degraded region',
        detail: 'Request replacement capacity from the provider in the same region that is failing.',
        risk: 'high',
        focus: 'speed',
        timeCostMin: 6,
        successChance: 0.25,
        success: {
          quality: 'partial',
          score: 20,
          effects: { health: 2, trust: -1, revenue: -3000, budget: -8000 },
          explanation:
            'A few instances actually launched in unaffected zones and eased the pressure. But buying more capacity inside a degraded region is betting the fire will not spread to your new servers.',
        },
        failure: {
          quality: 'failure',
          score: -45,
          effects: { health: -8, trust: -5, revenue: -12000, budget: -6000 },
          explanation:
            'Capacity requests failed or launched into the same degraded infrastructure and died. You spent budget and precious minutes buying servers in a burning building while the standby region idled.',
        },
      },
    ],
    timeout: {
      quality: 'failure',
      score: -85,
      effects: { health: -18, trust: -13, revenue: -30000, budget: 0 },
      explanation:
        'No response was made in time. The surviving region collapsed under full load, the failover happened in a panic hours later, and customers experienced the longest outage in company history.',
    },
  },
  {
    id: 'credential-leak',
    title: 'Credentials Exposed on Public Repo',
    severity: 'SEV1',
    category: 'Security',
    alert:
      'TruffleHog · security-scanner · Live AWS access key and database password detected in a public GitHub repo, pushed 43 minutes ago by an intern’s personal fork.',
    symptoms: [
      'A live AWS key with broad S3 and EC2 permissions is public',
      'The database password in the same file is currently valid',
      'CloudTrail shows no anomalous API calls — yet',
      'Automated scrapers typically find public keys within minutes',
    ],
    impact: { errorRate: 0 },
    revenueLossPerMin: 1500,
    healthDrainPerSec: 0.02,
    trustDrainPerSec: 0.08,
    recommended:
      'Revoke first, ask questions later. Rotate the key and password immediately — assume compromise from the moment of exposure — then audit CloudTrail, scrub the repo, and add pre-commit secret scanning.',
    actions: [
      {
        id: 'rotate-now',
        label: 'Revoke and rotate everything now',
        detail: 'Kill the AWS key and rotate the DB password immediately. Some services will briefly error until they pick up new secrets.',
        risk: 'low',
        focus: 'safety',
        timeCostMin: 6,
        successChance: 1,
        success: {
          quality: 'success',
          score: 120,
          effects: { health: 3, trust: 6, revenue: 2000, budget: -1000 },
          explanation:
            'The only correct answer, executed. A few services blipped while secrets propagated — a trivial price. CloudTrail confirmed the key was scraped nine minutes after your revocation. That close.',
        },
      },
      {
        id: 'delete-repo',
        label: 'Just delete the public repository',
        detail: 'Remove the exposed file and repo from GitHub. Fast, quiet, no service disruption.',
        risk: 'high',
        focus: 'speed',
        timeCostMin: 2,
        successChance: 0.2,
        success: {
          quality: 'partial',
          score: 5,
          effects: { health: 0, trust: 0, revenue: 0, budget: 0 },
          explanation:
            'Nothing bad happened — this time. But deleting the repo does not delete the forks, mirrors, and scraper caches that already copied it. The credentials are still live and still exposed. This only looked like a fix.',
        },
        failure: {
          quality: 'failure',
          score: -70,
          effects: { health: -10, trust: -15, revenue: -15000, budget: -8000 },
          explanation:
            'A scraper had already harvested the key. Hours later it was spinning up crypto-mining instances and exfiltrating an S3 bucket. Deleting the repo treated the symptom; the secret itself was the incident.',
        },
      },
      {
        id: 'audit-first',
        label: 'Audit CloudTrail before rotating',
        detail: 'Investigate whether the key was actually used before disrupting services with a rotation.',
        risk: 'medium',
        focus: 'safety',
        timeCostMin: 10,
        successChance: 0.55,
        success: {
          quality: 'partial',
          score: 40,
          effects: { health: 1, trust: 1, revenue: 0, budget: 0 },
          explanation:
            'The audit came back clean and you rotated afterward without incident. But every minute of auditing was a minute the key stayed live and public. Rotation should never wait on investigation — do both, in that order.',
        },
        failure: {
          quality: 'failure',
          score: -50,
          effects: { health: -6, trust: -10, revenue: -9000, budget: -4000 },
          explanation:
            'While you were reading CloudTrail, the key was used to enumerate S3 buckets. The access you were checking for happened during the check. Exposed credentials are compromised credentials — revoke first.',
        },
      },
      {
        id: 'quiet-handling',
        label: 'Rotate quietly, skip the disclosure',
        detail: 'Fix the credentials but keep the incident off the record to avoid alarming anyone.',
        risk: 'medium',
        focus: 'cost',
        timeCostMin: 6,
        successChance: 1,
        success: {
          quality: 'partial',
          score: 20,
          effects: { health: 3, trust: -4, revenue: 0, budget: -1000 },
          explanation:
            'The technical fix was right, but burying a security incident builds organizational debt. When it surfaced in the next audit, the cover-up cost more trust than the leak — internally and with customers.',
          delayed: {
            message:
              'Delayed fallout from “Credentials Exposed on Public Repo”: the undisclosed exposure surfaced in a compliance audit, triggering a formal finding and a scramble to reconstruct the timeline you never wrote down.',
            effects: { health: 0, trust: -5, revenue: -3000, budget: -2000 },
            score: -25,
          },
        },
      },
    ],
    timeout: {
      quality: 'failure',
      score: -85,
      effects: { health: -10, trust: -18, revenue: -20000, budget: -10000 },
      explanation:
        'No response was made in time. The key was scraped and abused: mining instances, an S3 exfiltration, and a mandatory customer disclosure. The cleanup took weeks.',
    },
  },
  {
    id: 'rate-limit-outage',
    title: 'Third-Party API Rate Limit Storm',
    severity: 'SEV3',
    category: 'Third-Party',
    alert:
      'Honeycomb · notifications-service · Email provider returning 429 Too Many Requests. Retry logic is retrying without backoff — request volume doubling every minute.',
    symptoms: [
      'A bulk campaign pushed the email provider past your plan’s rate limit',
      'The retry logic has no backoff or jitter — failed sends retry instantly',
      'The retry storm is now itself the main source of traffic',
      'Transactional email (password resets, receipts) is stuck behind the campaign queue',
    ],
    impact: { requestVolume: 40, errorRate: 8, cpu: 14 },
    revenueLossPerMin: 1100,
    healthDrainPerSec: 0.03,
    trustDrainPerSec: 0.03,
    recommended:
      'Stop the retry storm first — pause the campaign queue and add exponential backoff with jitter. Then prioritize transactional email through a separate lane so marketing volume can never starve password resets again.',
    actions: [
      {
        id: 'pause-backoff',
        label: 'Pause campaign, add backoff',
        detail: 'Halt the bulk queue, deploy exponential backoff with jitter, let transactional mail drain first.',
        risk: 'low',
        focus: 'safety',
        timeCostMin: 7,
        successChance: 1,
        success: {
          quality: 'success',
          score: 110,
          effects: { health: 5, trust: 3, revenue: 3000, budget: 0 },
          explanation:
            'Complete answer. The storm died the moment retries backed off, transactional email drained in minutes, and the campaign resumed later at a compliant rate. Retry-without-backoff is a self-inflicted DDoS.',
        },
      },
      {
        id: 'upgrade-plan',
        label: 'Buy a higher rate limit',
        detail: 'Upgrade the email provider plan on the spot to raise the ceiling.',
        risk: 'medium',
        focus: 'cost',
        timeCostMin: 4,
        successChance: 1,
        success: {
          quality: 'partial',
          score: 35,
          effects: { health: 2, trust: 1, revenue: 1000, budget: -7000 },
          explanation:
            'Throughput recovered, but you paid a permanent plan upgrade to absorb a retry bug. The storm will simply hit the new ceiling next campaign — the backoff fix is still owed.',
        },
      },
      {
        id: 'drop-queue',
        label: 'Flush the entire send queue',
        detail: 'Drop everything queued — campaign and transactional — to reset to zero instantly.',
        risk: 'high',
        focus: 'speed',
        timeCostMin: 2,
        successChance: 0.35,
        success: {
          quality: 'partial',
          score: 15,
          effects: { health: 3, trust: -3, revenue: 0, budget: 0 },
          explanation:
            'The storm stopped instantly, and by luck few transactional messages were queued at that moment. Still, silently deleting password resets and receipts is customer-visible data loss — you got away with it.',
        },
        failure: {
          quality: 'failure',
          score: -45,
          effects: { health: 1, trust: -9, revenue: -6000, budget: 0 },
          explanation:
            'The flush deleted hundreds of pending password resets and order receipts. Support lit up with locked-out users. The rate-limit blip became a trust incident because the fix did not distinguish critical from bulk mail.',
        },
      },
      {
        id: 'switch-provider',
        label: 'Cut over to a backup email provider',
        detail: 'Reroute all mail to a secondary provider that has never handled your volume.',
        risk: 'high',
        focus: 'speed',
        timeCostMin: 8,
        successChance: 0.4,
        success: {
          quality: 'partial',
          score: 30,
          effects: { health: 2, trust: 0, revenue: 1000, budget: -3000 },
          explanation:
            'The backup provider held, but your sending domain lacked warm reputation there — a chunk of mail landed in spam folders. Deliverability is earned over weeks, not switched on in an afternoon.',
        },
        failure: {
          quality: 'failure',
          score: -35,
          effects: { health: -2, trust: -6, revenue: -5000, budget: -3000 },
          explanation:
            'The unwarmed domain tripped the backup provider’s spam filters and most mail bounced or vanished. You added a second failing provider to the first. The retry bug — the actual cause — was still running the whole time.',
        },
      },
    ],
    timeout: {
      quality: 'failure',
      score: -65,
      effects: { health: -7, trust: -10, revenue: -10000, budget: 0 },
      explanation:
        'No response was made in time. The retry storm ran until the provider temporarily suspended the account for abuse, taking password resets down with it.',
    },
  },
  {
    id: 'config-corruption',
    title: 'Corrupted Deployment Configuration',
    severity: 'SEV2',
    category: 'Deployment',
    alert:
      'ArgoCD · platform-config · Malformed YAML merged to the config repo. Sync failing cluster-wide; any pod that restarts now cannot start.',
    symptoms: [
      'A bad merge left the central config repo with invalid YAML',
      'Running pods are fine, but any pod that restarts fails to boot',
      'Autoscaling and node rotation are effectively frozen',
      'The bad commit is identified; two later commits are stacked on top of it',
    ],
    impact: { errorRate: 3, cpu: 8 },
    revenueLossPerMin: 1600,
    healthDrainPerSec: 0.04,
    trustDrainPerSec: 0.02,
    recommended:
      'Revert the bad commit in git and let the config system re-sync — that is the entire point of declarative, version-controlled config. Then add YAML validation to CI so malformed config can never merge again.',
    actions: [
      {
        id: 'git-revert',
        label: 'Revert the bad commit',
        detail: 'git revert the malformed change, rebase the two later commits, let ArgoCD re-sync.',
        risk: 'low',
        focus: 'safety',
        timeCostMin: 5,
        successChance: 1,
        success: {
          quality: 'success',
          score: 110,
          effects: { health: 6, trust: 2, revenue: 4000, budget: 0 },
          explanation:
            'This is why config lives in git. The revert restored valid state cluster-wide in one sync cycle, the stacked commits reapplied cleanly, and a YAML linter went into CI the same afternoon.',
        },
      },
      {
        id: 'hand-edit',
        label: 'Hand-edit the live cluster config',
        detail: 'Bypass git and patch the config directly on the cluster to unblock restarts now.',
        risk: 'high',
        focus: 'speed',
        timeCostMin: 3,
        successChance: 0.5,
        success: {
          quality: 'partial',
          score: 35,
          effects: { health: 4, trust: 0, revenue: 2000, budget: 0 },
          explanation:
            'The live patch unblocked restarts — and created drift between the cluster and the repo. The next ArgoCD sync will stomp your hand-edit and re-break everything unless someone also fixes git. You now have two sources of truth.',
          delayed: {
            message:
              'Delayed fallout from “Corrupted Deployment Configuration”: the next scheduled sync overwrote your manual patch with the still-broken repo state, and restarts failed again until the commit was properly reverted.',
            effects: { health: -5, trust: -2, revenue: -5000, budget: 0 },
            score: -20,
          },
        },
        failure: {
          quality: 'failure',
          score: -45,
          effects: { health: -9, trust: -4, revenue: -10000, budget: 0 },
          explanation:
            'A typo in the manual patch took down the service mesh config, and the sync system fought your edits the whole time. Bypassing the declarative pipeline during an incident is how one broken file becomes five.',
        },
      },
      {
        id: 'freeze-cluster',
        label: 'Freeze all restarts and rotations',
        detail: 'Disable autoscaling, node rotation, and deploys so nothing restarts while you investigate.',
        risk: 'medium',
        focus: 'safety',
        timeCostMin: 9,
        successChance: 1,
        success: {
          quality: 'partial',
          score: 50,
          effects: { health: 1, trust: 0, revenue: -3000, budget: 0 },
          explanation:
            'The freeze prevented any pod from hitting the broken config — a sound containment move. But the cluster sat unable to scale or heal for nine minutes when a one-line git revert was available the whole time.',
        },
      },
      {
        id: 'redeploy-all',
        label: 'Force-redeploy every service',
        detail: 'Trigger a full redeploy to "flush the bad state through" the system.',
        risk: 'high',
        focus: 'speed',
        timeCostMin: 4,
        successChance: 0.15,
        success: {
          quality: 'partial',
          score: 10,
          effects: { health: -2, trust: -1, revenue: -2000, budget: 0 },
          explanation:
            'By pure luck the sync pulled a cached older config for most services and the mass restart mostly survived. The reasoning was still backwards — redeploying pushes every pod through the broken config, not around it.',
        },
        failure: {
          quality: 'failure',
          score: -60,
          effects: { health: -14, trust: -7, revenue: -15000, budget: 0 },
          explanation:
            'Every restarted pod hit the malformed config and failed to boot. The redeploy converted "future restarts will fail" into "everything is down right now." Understand the failure mode before acting on it.',
        },
      },
    ],
    timeout: {
      quality: 'failure',
      score: -70,
      effects: { health: -11, trust: -6, revenue: -13000, budget: 0 },
      explanation:
        'No response was made in time. Natural pod churn slowly ate the fleet as restarting pods failed one by one, turning a contained config bug into a creeping outage.',
    },
  },
  {
    id: 'ddos',
    title: 'Denial-of-Service Traffic Flood',
    severity: 'SEV1',
    category: 'Security',
    alert:
      'Cloudflare · edge · Inbound traffic 40x baseline from ~12,000 unique IPs. Pattern: junk POSTs to /api/search. Origin CPU saturated.',
    symptoms: [
      'Coordinated junk POSTs from thousands of IPs across many networks',
      'Requests carry randomized payloads targeting the expensive search endpoint',
      'Legitimate users seeing timeouts as origin capacity saturates',
      'A CDN/WAF sits in front but challenge rules are not enabled',
    ],
    impact: { requestVolume: 180, cpu: 52, errorRate: 19, dbLatency: 160 },
    revenueLossPerMin: 3800,
    healthDrainPerSec: 0.09,
    trustDrainPerSec: 0.04,
    recommended:
      'Fight it at the edge, not the origin: enable WAF challenge rules for the attack pattern so bots get filtered before touching your servers. Blocking IPs one by one loses to a botnet; scaling the origin is paying to absorb the punch.',
    actions: [
      {
        id: 'waf-challenge',
        label: 'Enable WAF challenge rules at the edge',
        detail: 'Turn on managed bot challenges scoped to the attack pattern on /api/search.',
        risk: 'low',
        focus: 'safety',
        timeCostMin: 5,
        successChance: 0.9,
        success: {
          quality: 'success',
          score: 120,
          effects: { health: 8, trust: 3, revenue: 9000, budget: -2000 },
          explanation:
            'The right layer for the job. Challenges filtered the botnet at the edge — origin load fell 95% in two minutes while real users passed through mostly unbothered. This is what the WAF was for.',
        },
        failure: {
          quality: 'partial',
          score: 40,
          effects: { health: 3, trust: -2, revenue: 0, budget: -2000 },
          explanation:
            'The challenge rules caught most of the flood, but an overly broad rule also challenged legitimate API clients, breaking a few integrations until you scoped it down. Right idea, rushed scoping.',
        },
      },
      {
        id: 'block-ips',
        label: 'Block attacking IPs manually',
        detail: 'Script a blocklist from the top offending addresses and push it to the firewall.',
        risk: 'medium',
        focus: 'speed',
        timeCostMin: 8,
        successChance: 1,
        success: {
          quality: 'partial',
          score: 30,
          effects: { health: 1, trust: -1, revenue: -4000, budget: 0 },
          explanation:
            'You blocked ten thousand IPs; the botnet rotated to ten thousand new ones. Manual IP blocking against a distributed attack is a treadmill — the edge challenge does this at layer 7, automatically.',
        },
      },
      {
        id: 'scale-through',
        label: 'Massively scale the origin',
        detail: 'Quadruple origin capacity and try to absorb the flood with raw compute.',
        risk: 'medium',
        focus: 'cost',
        timeCostMin: 6,
        successChance: 0.5,
        success: {
          quality: 'partial',
          score: 35,
          effects: { health: 3, trust: 1, revenue: 2000, budget: -16000 },
          explanation:
            'Capacity absorbed the attack and users recovered — at enormous cost, and the attacker pays nothing to escalate. You won a bidding war against a botnet; that is not a sustainable defense.',
        },
        failure: {
          quality: 'failure',
          score: -40,
          effects: { health: -8, trust: -4, revenue: -10000, budget: -16000 },
          explanation:
            'The flood scaled faster than your autoscaling group. The database became the next bottleneck anyway — capacity you pay for, attacks they generate for free. The economics only work at the edge.',
        },
      },
      {
        id: 'geo-block',
        label: 'Geo-block the top attacking regions',
        detail: 'Block entire countries where attack traffic concentrates. Fast, crude, hits real users too.',
        risk: 'high',
        focus: 'speed',
        timeCostMin: 3,
        successChance: 0.45,
        success: {
          quality: 'partial',
          score: 25,
          effects: { health: 4, trust: -4, revenue: -5000, budget: 0 },
          explanation:
            'The flood dropped 70% and origin recovered — along with every legitimate customer in the blocked regions locked out mid-session. A blunt instrument that worked, at real customer cost.',
        },
        failure: {
          quality: 'failure',
          score: -45,
          effects: { health: -6, trust: -8, revenue: -11000, budget: 0 },
          explanation:
            'The botnet was globally distributed, so the geo-block barely dented it — while paying customers in blocked countries flooded support. You inflicted collateral damage without stopping the attack.',
        },
      },
    ],
    timeout: {
      quality: 'failure',
      score: -85,
      effects: { health: -17, trust: -11, revenue: -26000, budget: 0 },
      explanation:
        'No response was made in time. The origin saturated completely and the site was effectively down for the duration of the attack, with the WAF sitting idle in front of it.',
    },
  },
];

export function getIncident(id: string): Incident {
  const found = INCIDENTS.find((i) => i.id === id);
  if (!found) throw new Error(`Unknown incident: ${id}`);
  return found;
}
