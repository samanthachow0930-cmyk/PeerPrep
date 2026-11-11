export const SECTORS = ['Engineering', 'Business', 'Science', 'Humanities'];

const RULES = [
  ['Engineering', 'Computer Engineering', ['computer engineering', 'embedded', 'firmware', 'microcontroller', 'fpga', 'computer architecture']],
  ['Engineering', 'Electronic Engineering', ['electronic engineering', 'electrical engineering', 'circuit', 'pcb', 'signal processing']],
  ['Engineering', 'Mechanical Engineering', ['mechanical engineering', 'cad', 'solidworks', 'thermodynamics', 'manufacturing']],
  ['Engineering', 'Civil Engineering', ['civil engineering', 'structural', 'construction', 'geotechnical']],
  ['Engineering', 'Chemical Engineering', ['chemical engineering', 'process design', 'reactor']],
  ['Engineering', 'Industrial Engineering', ['industrial engineering', 'supply chain', 'operations research', 'logistics']],
  ['Business', 'Accounting', ['accounting', 'audit', 'cpa', 'taxation', 'financial reporting']],
  ['Business', 'Finance', ['finance', 'investment', 'equity', 'banking', 'valuation', 'portfolio']],
  ['Business', 'Marketing', ['marketing', 'brand', 'market research', 'seo', 'social media']],
  ['Business', 'Economics', ['economics', 'econometrics', 'macroeconomic', 'microeconomic']],
  ['Business', 'Management', ['management', 'human resources', 'consulting', 'strategy', 'entrepreneurship']],
  ['Business', 'Business Analytics', ['business analytics', 'information systems', 'business intelligence', 'tableau', 'power bi']],
  ['Science', 'Computer Science', ['computer science', 'algorithm', 'algorithms', 'machine learning', 'data structures', 'software engineer']],
  ['Science', 'Data Science', ['data science', 'statistics', 'data analysis', 'pandas', 'regression']],
  ['Science', 'Mathematics', ['mathematics', 'calculus', 'linear algebra', 'probability', 'applied math']],
  ['Science', 'Physics', ['physics', 'quantum', 'optics']],
  ['Science', 'Chemistry', ['chemistry', 'organic', 'spectroscopy', 'chromatography']],
  ['Science', 'Life Science', ['biology', 'biochemistry', 'biotechnology', 'molecular', 'genetics']],
  ['Humanities', 'Languages & Linguistics', ['linguistics', 'translation', 'literature', 'language studies']],
  ['Humanities', 'History & Philosophy', ['history', 'philosophy', 'ethics', 'cultural studies']],
  ['Humanities', 'Social Science', ['sociology', 'psychology', 'anthropology', 'political science', 'public policy']],
  ['Humanities', 'Journalism & Media', ['journalism', 'media', 'communication', 'editing', 'creative writing']],
].map(([sector, tag, kws]) => ({
  sector, tag,
  res: kws.map((k) => new RegExp('\\b' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i')),
}));

export function detectProfile(text = '') {
  const hits = RULES.map((r) => ({ ...r, n: r.res.filter((re) => re.test(text)).length })).filter((r) => r.n > 0);
  if (!hits.length) return { sector: null, tags: [] };
  const bySector = {};
  hits.forEach((h) => { bySector[h.sector] = (bySector[h.sector] || 0) + h.n; });
  const sector = Object.entries(bySector).sort((a, b) => b[1] - a[1])[0][0];
  const tags = hits.sort((a, b) => b.n - a.n).slice(0, 3).map((h) => h.tag);
  return { sector, tags };
}

export const mergeTags = (...lists) => [...new Set(lists.flat().filter(Boolean).map((t) => t.trim()))].slice(0, 8);