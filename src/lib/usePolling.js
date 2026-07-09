// ─────────────────────────────────────────────────────────────────────────────
// usePolling — community sentiment hook
//
// Manages anonymous voting on bills and live sentiment fetching.
//
// Anonymous fingerprint:
//   Stored in localStorage as "poli-fp". Generated once per browser.
//   Not tied to any account. Not PII. Cannot be reversed to identify anyone.
//   Prevents trivial ballot-stuffing but not determined multi-device voting —
//   which is acceptable for a directional community sentiment tool.
//
// Sentiment data:
//   Fetched from the bill_sentiment view (aggregated counts).
//   Merged into liveBills so support/oppose/neutral percentages are live.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";

// Generate or retrieve a persistent anonymous fingerprint
function getFingerprint() {
  try {
    let fp = localStorage.getItem("poli-fp");
    if (!fp) {
      fp = "fp_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("poli-fp", fp);
    }
    return fp;
  } catch {
    // localStorage blocked (private browsing etc) — use session-only ID
    return "fp_" + Math.random().toString(36).slice(2);
  }
}

export function usePolling(supabase) {
  const [votes, setVotes]           = useState({});   // { billId: "support"|"oppose"|"neutral" }
  const [sentiment, setSentiment]   = useState({});   // { billId: { support_pct, oppose_pct, neutral_pct, total_count } }
  const [loading, setLoading]       = useState(false);
  const fingerprint                 = getFingerprint();

  // Load existing vote from Supabase for this device on mount
  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("bill_votes")
      .select("bill_id, position")
      .eq("fingerprint", fingerprint)
      .then(({ data }) => {
        if (!data) return;
        const existing = {};
        data.forEach(r => { existing[r.bill_id] = r.position; });
        setVotes(existing);
      });
  }, [supabase, fingerprint]);

  // Fetch aggregate sentiment for a list of bill IDs
  const fetchSentiment = useCallback((billIds) => {
    if (!supabase || !billIds?.length) return;
    supabase
      .from("bill_sentiment")
      .select("bill_id,support_pct,oppose_pct,neutral_pct,total_count")
      .in("bill_id", billIds)
      .then(({ data }) => {
        if (!data) return;
        const agg = {};
        data.forEach(r => { agg[r.bill_id] = r; });
        setSentiment(prev => ({ ...prev, ...agg }));
      });
  }, [supabase]);

  // Cast a vote — optimistic update then sync to Supabase
  const castVote = useCallback(async (billId, position) => {
    if (!supabase || !billId) return;

    const prev = votes[billId];

    // Optimistic update
    setVotes(v => ({ ...v, [billId]: position }));

    // Optimistically update sentiment counts
    setSentiment(prev_s => {
      const s = prev_s[billId] || { support_pct: 0, oppose_pct: 0, neutral_pct: 0, total_count: 0 };
      return { ...prev_s, [billId]: { ...s, _pending: true } };
    });

    try {
      // Upsert — handles both new vote and changing an existing vote
      const { error } = await supabase
        .from("bill_votes")
        .upsert(
          { bill_id: billId, position, fingerprint },
          { onConflict: "bill_id,fingerprint" }
        );

      if (error) {
        // Revert on error
        setVotes(v => ({ ...v, [billId]: prev }));
        console.error("Vote error:", error);
        return;
      }

      // Refresh live sentiment for this bill
      fetchSentiment([billId]);
    } catch (e) {
      setVotes(v => ({ ...v, [billId]: prev }));
    }
  }, [supabase, votes, fingerprint, fetchSentiment]);

  // Merge sentiment into a bill array
  const mergeSentiment = useCallback((bills) => {
    if (!bills?.length) return bills;
    return bills.map(b => {
      const s = sentiment[b.id];
      if (!s || s._pending) return b;
      return {
        ...b,
        support: s.support_pct || 0,
        oppose:  s.oppose_pct  || 0,
        neutral: s.neutral_pct || 0,
        totalVotes: s.total_count || 0,
      };
    });
  }, [sentiment]);

  return { votes, castVote, sentiment, fetchSentiment, mergeSentiment };
}
