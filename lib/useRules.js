'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const DEFAULTS = {
  cv_request_cost: 5, review_reward: 5, enquiry_cost: 5, reply_reward: 5,
  mock_1to1_cost: 8, mock_group_cost: 12, reviews_per_request: 2,
};

export function useRules() {
  const [rules, setRules] = useState(DEFAULTS);
  useEffect(() => {
    supabase.from('credit_rules').select('key, value').then(({ data }) => {
      if (data?.length) setRules({ ...DEFAULTS, ...Object.fromEntries(data.map((r) => [r.key, r.value])) });
    });
  }, []);
  return rules;
}