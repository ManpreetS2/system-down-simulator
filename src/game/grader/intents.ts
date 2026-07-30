import type { IntentId } from './types';

export const INTENT_LABELS: Record<IntentId, string> = {
  investigate_logs: 'investigate logs',
  inspect_deployment: 'inspect deployment',
  rollback: 'rollback',
  restart: 'restart services',
  scale: 'scale capacity',
  rate_limit: 'rate limit traffic',
  shed_load: 'shed load',
  disable_feature: 'disable feature',
  rotate_credentials: 'rotate credentials',
  revoke_credentials: 'revoke credentials',
  preserve_logs: 'preserve diagnostic evidence',
  verify_data: 'verify data integrity',
  restore_gradually: 'restore gradually',
  communicate_status: 'communicate status',
  monitor: 'monitor',
  add_prevention: 'add prevention',
  failover: 'failover',
  cache_purge: 'purge cache',
  queue_retry: 'queue and retry',
  waf_challenge: 'enable WAF / bot challenges',
  kill_queries: 'kill runaway queries',
  issue_certificate: 'issue certificate',
  pause_campaign: 'pause campaign / backoff',
  edge_cache: 'cache at the edge',
};

/**
 * Phrase patterns → intent. Longer / more specific phrases should be listed
 * before short ones when order matters; matching is done against normalized text.
 */
export const INTENT_PATTERNS: Array<{ intent: IntentId; patterns: RegExp[] }> = [
  {
    intent: 'rollback',
    patterns: [
      /\broll\s*back\b/,
      /\brevert(?:ing|ed)?\b/,
      /\bprevious (?:release|deploy|version)\b/,
      /\bundep?loy\b/,
    ],
  },
  {
    intent: 'inspect_deployment',
    patterns: [
      /\bcheck(?:ing)? (?:the )?deploy/,
      /\binspect(?:ing)? (?:the )?deploy/,
      /\brecent deploy/,
      /\bdeploy(?:ment)? (?:history|diff|change)/,
      /\bwhat shipped\b/,
    ],
  },
  {
    intent: 'investigate_logs',
    patterns: [
      /\bcheck(?:ing)? (?:the )?logs?\b/,
      /\binspect(?:ing)? (?:the )?logs?\b/,
      /\breview(?:ing)? (?:the )?logs?\b/,
      /\bread(?:ing)? (?:the )?logs?\b/,
      /\blook(?:ing)? at (?:the )?logs?\b/,
      /\berror logs?\b/,
      /\bstack traces?\b/,
    ],
  },
  {
    intent: 'waf_challenge',
    patterns: [
      /\bwaf\b/,
      /\bbot challenge/,
      /\bchallenge rules?\b/,
      /\bedge (?:filter|rule|protect)/,
      /\bcloudflare (?:rule|challenge|waf)/,
    ],
  },
  {
    intent: 'rate_limit',
    patterns: [/\brate[-\s]?limit/, /\bthrottle(?:ing)?\b/, /\bthrottl/],
  },
  {
    intent: 'shed_load',
    patterns: [
      /\bshed(?:ding)? (?:load|traffic|non[- ]critical)/,
      /\bdisable (?:heavy|non[- ]critical) features?/,
      /\bgraceful degradation/,
    ],
  },
  {
    intent: 'scale',
    patterns: [
      /\bscale(?:\s|-)(?:up|out)\b/,
      /\badd(?:ing)? (?:more )?(?:capacity|instances|pods|servers)/,
      /\braise(?:ing)? (?:the )?autoscale/,
      /\bbigger instance/,
    ],
  },
  {
    intent: 'restart',
    patterns: [
      /\brestart(?:ing)?\b/,
      /\breboot(?:ing)?\b/,
      /\bbounce(?:ing)? (?:the )?(?:pods?|services?|nodes?)/,
      /\brestart everything\b/,
    ],
  },
  {
    intent: 'rotate_credentials',
    patterns: [
      /\brotat(?:e|ing)\b(?:\s+\w+){0,4}\s+(?:credentials?|secrets?|keys?|passwords?|certs?)/,
      /\brevoke and rotate\b/,
      /\brotat(?:e|ing)\b/,
      /\bissue(?:ing)? (?:a )?new (?:key|secret|password|cert)/,
    ],
  },
  {
    intent: 'revoke_credentials',
    patterns: [
      /\brevok(?:e|ing)\b/,
      /\binvalidat(?:e|ing) (?:the )?(?:key|credential|secret)/,
      /\bkill(?:ing)? (?:the )?(?:key|access|credential)/,
      /\bdisable(?:ing)? (?:the )?(?:key|credential)/,
    ],
  },
  {
    intent: 'preserve_logs',
    patterns: [
      /\bpreserve(?:ing)? (?:logs?|evidence|forensics?)/,
      /\bdon'?t delete logs?/,
      /\bsnapshot(?:ing)? (?:logs?|disk|evidence)/,
      /\bcollect(?:ing)? (?:forensics?|evidence)/,
    ],
  },
  {
    intent: 'verify_data',
    patterns: [
      /\bverif(?:y|ying) (?:data|integrity|replication|lag)/,
      /\bcheck(?:ing)? (?:data )?integrity/,
      /\bconfirm(?:ing)? (?:the )?data/,
    ],
  },
  {
    intent: 'restore_gradually',
    patterns: [
      /\bgradual(?:ly)? restor/,
      /\bcanary\b/,
      /\bshift(?:ing)? traffic (?:slowly|gradually)/,
      /\brestore(?:ing)? (?:service )?carefully/,
    ],
  },
  {
    intent: 'communicate_status',
    patterns: [
      /\bstatus (?:page|banner|update)/,
      /\bcommunicat(?:e|ing)\b/,
      /\bnotify(?:ing)? (?:customers?|users?)/,
      /\bpost(?:ing)? (?:a )?(?:banner|update|status)/,
      /\btell(?:ing)? customers?/,
    ],
  },
  {
    intent: 'monitor',
    patterns: [
      /\bmonitor(?:ing)?\b/,
      /\bwatch(?:ing)? (?:the )?(?:metrics|graphs|dashboards?)/,
      /\bkeep(?:ing)? an eye\b/,
    ],
  },
  {
    intent: 'add_prevention',
    patterns: [
      /\bprevent(?:ion|ing)?\b/,
      /\bfix(?:ing)? (?:the )?root cause/,
      /\badd(?:ing)? (?:a )?(?:linter|alert|monitor|guardrail|test)/,
      /\bpostmortem action/,
    ],
  },
  {
    intent: 'failover',
    patterns: [
      /\bfail\s*over\b/,
      /\bswitch(?:ing)? to (?:the )?(?:backup|secondary|standby)/,
      /\bcut over\b/,
      /\bsecondary (?:region|provider)/,
    ],
  },
  {
    intent: 'edge_cache',
    patterns: [
      /\baggressive(?:ly)? cache/,
      /\bcache (?:the )?(?:hot|landing|product) pages?/,
      /\braise(?:ing)? (?:cache )?ttls?\b/,
      /\bcd n cache/,
      /\bpush(?:ing)? (?:pages? )?to (?:the )?cdn/,
      /\bstatic(?:ally)? (?:render|serve)/,
    ],
  },
  {
    intent: 'cache_purge',
    patterns: [
      /\bpurge(?:ing)? (?:the )?cache/,
      /\binvalidat(?:e|ing) (?:the )?cache/,
      /\bflush(?:ing)? (?:the )?cache/,
      /\bclear(?:ing)? (?:the )?cache/,
      /\btargeted purge/,
      /\bpurge(?:ing)? (?:only )?(?:affected |stale )?keys?/,
    ],
  },
  {
    intent: 'queue_retry',
    patterns: [
      /\bqueue(?:ing)? (?:for )?retry/,
      /\bretry(?:ing)? (?:later|automatically)/,
      /\bstore(?:ing)? (?:payment )?intents?/,
    ],
  },
  {
    intent: 'kill_queries',
    patterns: [
      /\bkill(?:ing)? (?:the )?(?:queries?|sessions?|connections?)/,
      /\bterminate(?:ing)? (?:runaway |long[- ]running )?queries?/,
      /\bblock(?:ing)? (?:the )?(?:noisy |bad )?client/,
    ],
  },
  {
    intent: 'issue_certificate',
    patterns: [
      /\bissue(?:ing)? (?:a )?(?:new )?cert/,
      /\brenew(?:ing)? (?:the )?(?:ssl|tls|certificate)/,
      /\bfresh (?:ssl|tls )?cert/,
    ],
  },
  {
    intent: 'pause_campaign',
    patterns: [
      /\bpause(?:ing)? (?:the )?(?:campaign|bulk|queue)/,
      /\badd(?:ing)? (?:exponential )?backoff/,
      /\bjitter\b/,
    ],
  },
  {
    intent: 'disable_feature',
    patterns: [
      /\bdisable(?:ing)? (?:the )?feature/,
      /\bfeature flag off/,
      /\bturn(?:ing)? off (?:the )?feature/,
      /\bkill switch/,
    ],
  },
];

export function normalizeResponseText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9\s\-./]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractIntents(text: string): Array<{ intent: IntentId; matchedPhrase: string }> {
  const normalized = normalizeResponseText(text);
  if (!normalized) return [];
  const found: Array<{ intent: IntentId; matchedPhrase: string }> = [];
  const seen = new Set<IntentId>();
  for (const entry of INTENT_PATTERNS) {
    for (const pattern of entry.patterns) {
      const match = normalized.match(pattern);
      if (match && !seen.has(entry.intent)) {
        seen.add(entry.intent);
        found.push({ intent: entry.intent, matchedPhrase: match[0] });
        break;
      }
    }
  }
  return found;
}
