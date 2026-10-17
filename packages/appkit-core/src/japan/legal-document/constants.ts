export const LAYOUT = {
  titleFontSize: 18,
  titleReferenceFontSize: 11,
  articleFontSize: 11,
  bodyFontSize: 10,
  preambleIndent: 0,
  articleIndent: 0,
  bodyIndent: 1,
  numberedItemIndent: 2,
  continuationIndent: 3,
  lineHeight: 1.8,
  signatureBlockRightMargin: 5,
  pageMargins: { top: 60, right: 60, bottom: 60, left: 60 },
} as const;

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  contract: '契約書',
  memorandum: '覚書',
  nda: '秘密保持契約書',
  powerOfAttorney: '委任状',
  regulations: '規約',
  application: '申込書',
  request: '申請書',
};

export const DOCUMENT_PREAMBLE: Record<string, string> = {
  contract: '上記当事者間において、以下のとおり契約を締結する。',
  memorandum: '上記当事者間において、以下のとおり合意した。',
  nda: '上記当事者間は、機密情報の取扱いに関し、以下のとおり合意する。',
};

export const DOCUMENT_POSTAMBLE: Record<string, string> = {
  contract: '以上、本契約の証として本書2通を作成し、当事者記名押印の上、各1通を保有する。',
  memorandum: '以上、本覚書の証として本書2通を作成し、当事者記名押印の上、各1通を保有する。',
  nda: '以上、本契約の証として本書2通を作成し、当事者記名押印の上、各1通を保有する。',
};
