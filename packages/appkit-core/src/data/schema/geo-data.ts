/**
 * Geographic Data - ISO 3166 Codes.
 *
 * ISO standard data for countries, subdivisions, and postal code patterns.
 */

// =============================================================================
// Types
// =============================================================================

export interface CountryOption {
  /** ISO 3166-1 alpha-2 code */
  value: string;
  /** Japanese label */
  label: string;
  /** English label */
  labelEn: string;
}

export interface SubdivisionOption {
  /** ISO 3166-2 code (e.g., JP-13, US-CA) */
  value: string;
  /** Local label */
  label: string;
  /** English label (optional) */
  labelEn?: string;
}

export interface PostalPattern {
  /** Validation regex */
  pattern: RegExp;
  /** Format description */
  format: string;
  /** Example value */
  example: string;
}

// =============================================================================
// Countries - ISO 3166-1 alpha-2
// =============================================================================

export const COUNTRIES: CountryOption[] = [
  // East Asia
  { value: 'JP', label: '日本', labelEn: 'Japan' },
  { value: 'CN', label: '中国', labelEn: 'China' },
  { value: 'KR', label: '韓国', labelEn: 'South Korea' },
  { value: 'TW', label: '台湾', labelEn: 'Taiwan' },
  { value: 'HK', label: '香港', labelEn: 'Hong Kong' },
  // North America
  { value: 'US', label: 'アメリカ合衆国', labelEn: 'United States' },
  { value: 'CA', label: 'カナダ', labelEn: 'Canada' },
  { value: 'MX', label: 'メキシコ', labelEn: 'Mexico' },
  // Europe
  { value: 'GB', label: 'イギリス', labelEn: 'United Kingdom' },
  { value: 'DE', label: 'ドイツ', labelEn: 'Germany' },
  { value: 'FR', label: 'フランス', labelEn: 'France' },
  { value: 'IT', label: 'イタリア', labelEn: 'Italy' },
  { value: 'ES', label: 'スペイン', labelEn: 'Spain' },
  { value: 'NL', label: 'オランダ', labelEn: 'Netherlands' },
  { value: 'BE', label: 'ベルギー', labelEn: 'Belgium' },
  { value: 'CH', label: 'スイス', labelEn: 'Switzerland' },
  { value: 'AT', label: 'オーストリア', labelEn: 'Austria' },
  { value: 'SE', label: 'スウェーデン', labelEn: 'Sweden' },
  { value: 'NO', label: 'ノルウェー', labelEn: 'Norway' },
  { value: 'DK', label: 'デンマーク', labelEn: 'Denmark' },
  { value: 'FI', label: 'フィンランド', labelEn: 'Finland' },
  { value: 'PL', label: 'ポーランド', labelEn: 'Poland' },
  { value: 'PT', label: 'ポルトガル', labelEn: 'Portugal' },
  { value: 'IE', label: 'アイルランド', labelEn: 'Ireland' },
  // Oceania
  { value: 'AU', label: 'オーストラリア', labelEn: 'Australia' },
  { value: 'NZ', label: 'ニュージーランド', labelEn: 'New Zealand' },
  // Southeast Asia
  { value: 'SG', label: 'シンガポール', labelEn: 'Singapore' },
  { value: 'TH', label: 'タイ', labelEn: 'Thailand' },
  { value: 'VN', label: 'ベトナム', labelEn: 'Vietnam' },
  { value: 'PH', label: 'フィリピン', labelEn: 'Philippines' },
  { value: 'MY', label: 'マレーシア', labelEn: 'Malaysia' },
  { value: 'ID', label: 'インドネシア', labelEn: 'Indonesia' },
  // South Asia
  { value: 'IN', label: 'インド', labelEn: 'India' },
  // Middle East
  { value: 'AE', label: 'アラブ首長国連邦', labelEn: 'United Arab Emirates' },
  { value: 'IL', label: 'イスラエル', labelEn: 'Israel' },
  // South America
  { value: 'BR', label: 'ブラジル', labelEn: 'Brazil' },
  { value: 'AR', label: 'アルゼンチン', labelEn: 'Argentina' },
  { value: 'CL', label: 'チリ', labelEn: 'Chile' },
  // Africa
  { value: 'ZA', label: '南アフリカ', labelEn: 'South Africa' },
  { value: 'EG', label: 'エジプト', labelEn: 'Egypt' },
  // Russia
  { value: 'RU', label: 'ロシア', labelEn: 'Russia' },
];

// =============================================================================
// Subdivisions - ISO 3166-2
// =============================================================================

export const SUBDIVISIONS: Record<string, SubdivisionOption[]> = {
  // Japan - Prefectures (JIS X 0401 / ISO 3166-2:JP)
  JP: [
    { value: 'JP-01', label: '北海道', labelEn: 'Hokkaido' },
    { value: 'JP-02', label: '青森県', labelEn: 'Aomori' },
    { value: 'JP-03', label: '岩手県', labelEn: 'Iwate' },
    { value: 'JP-04', label: '宮城県', labelEn: 'Miyagi' },
    { value: 'JP-05', label: '秋田県', labelEn: 'Akita' },
    { value: 'JP-06', label: '山形県', labelEn: 'Yamagata' },
    { value: 'JP-07', label: '福島県', labelEn: 'Fukushima' },
    { value: 'JP-08', label: '茨城県', labelEn: 'Ibaraki' },
    { value: 'JP-09', label: '栃木県', labelEn: 'Tochigi' },
    { value: 'JP-10', label: '群馬県', labelEn: 'Gunma' },
    { value: 'JP-11', label: '埼玉県', labelEn: 'Saitama' },
    { value: 'JP-12', label: '千葉県', labelEn: 'Chiba' },
    { value: 'JP-13', label: '東京都', labelEn: 'Tokyo' },
    { value: 'JP-14', label: '神奈川県', labelEn: 'Kanagawa' },
    { value: 'JP-15', label: '新潟県', labelEn: 'Niigata' },
    { value: 'JP-16', label: '富山県', labelEn: 'Toyama' },
    { value: 'JP-17', label: '石川県', labelEn: 'Ishikawa' },
    { value: 'JP-18', label: '福井県', labelEn: 'Fukui' },
    { value: 'JP-19', label: '山梨県', labelEn: 'Yamanashi' },
    { value: 'JP-20', label: '長野県', labelEn: 'Nagano' },
    { value: 'JP-21', label: '岐阜県', labelEn: 'Gifu' },
    { value: 'JP-22', label: '静岡県', labelEn: 'Shizuoka' },
    { value: 'JP-23', label: '愛知県', labelEn: 'Aichi' },
    { value: 'JP-24', label: '三重県', labelEn: 'Mie' },
    { value: 'JP-25', label: '滋賀県', labelEn: 'Shiga' },
    { value: 'JP-26', label: '京都府', labelEn: 'Kyoto' },
    { value: 'JP-27', label: '大阪府', labelEn: 'Osaka' },
    { value: 'JP-28', label: '兵庫県', labelEn: 'Hyogo' },
    { value: 'JP-29', label: '奈良県', labelEn: 'Nara' },
    { value: 'JP-30', label: '和歌山県', labelEn: 'Wakayama' },
    { value: 'JP-31', label: '鳥取県', labelEn: 'Tottori' },
    { value: 'JP-32', label: '島根県', labelEn: 'Shimane' },
    { value: 'JP-33', label: '岡山県', labelEn: 'Okayama' },
    { value: 'JP-34', label: '広島県', labelEn: 'Hiroshima' },
    { value: 'JP-35', label: '山口県', labelEn: 'Yamaguchi' },
    { value: 'JP-36', label: '徳島県', labelEn: 'Tokushima' },
    { value: 'JP-37', label: '香川県', labelEn: 'Kagawa' },
    { value: 'JP-38', label: '愛媛県', labelEn: 'Ehime' },
    { value: 'JP-39', label: '高知県', labelEn: 'Kochi' },
    { value: 'JP-40', label: '福岡県', labelEn: 'Fukuoka' },
    { value: 'JP-41', label: '佐賀県', labelEn: 'Saga' },
    { value: 'JP-42', label: '長崎県', labelEn: 'Nagasaki' },
    { value: 'JP-43', label: '熊本県', labelEn: 'Kumamoto' },
    { value: 'JP-44', label: '大分県', labelEn: 'Oita' },
    { value: 'JP-45', label: '宮崎県', labelEn: 'Miyazaki' },
    { value: 'JP-46', label: '鹿児島県', labelEn: 'Kagoshima' },
    { value: 'JP-47', label: '沖縄県', labelEn: 'Okinawa' },
  ],

  // United States - States (ISO 3166-2:US)
  US: [
    { value: 'US-AL', label: 'Alabama' },
    { value: 'US-AK', label: 'Alaska' },
    { value: 'US-AZ', label: 'Arizona' },
    { value: 'US-AR', label: 'Arkansas' },
    { value: 'US-CA', label: 'California' },
    { value: 'US-CO', label: 'Colorado' },
    { value: 'US-CT', label: 'Connecticut' },
    { value: 'US-DE', label: 'Delaware' },
    { value: 'US-DC', label: 'District of Columbia' },
    { value: 'US-FL', label: 'Florida' },
    { value: 'US-GA', label: 'Georgia' },
    { value: 'US-HI', label: 'Hawaii' },
    { value: 'US-ID', label: 'Idaho' },
    { value: 'US-IL', label: 'Illinois' },
    { value: 'US-IN', label: 'Indiana' },
    { value: 'US-IA', label: 'Iowa' },
    { value: 'US-KS', label: 'Kansas' },
    { value: 'US-KY', label: 'Kentucky' },
    { value: 'US-LA', label: 'Louisiana' },
    { value: 'US-ME', label: 'Maine' },
    { value: 'US-MD', label: 'Maryland' },
    { value: 'US-MA', label: 'Massachusetts' },
    { value: 'US-MI', label: 'Michigan' },
    { value: 'US-MN', label: 'Minnesota' },
    { value: 'US-MS', label: 'Mississippi' },
    { value: 'US-MO', label: 'Missouri' },
    { value: 'US-MT', label: 'Montana' },
    { value: 'US-NE', label: 'Nebraska' },
    { value: 'US-NV', label: 'Nevada' },
    { value: 'US-NH', label: 'New Hampshire' },
    { value: 'US-NJ', label: 'New Jersey' },
    { value: 'US-NM', label: 'New Mexico' },
    { value: 'US-NY', label: 'New York' },
    { value: 'US-NC', label: 'North Carolina' },
    { value: 'US-ND', label: 'North Dakota' },
    { value: 'US-OH', label: 'Ohio' },
    { value: 'US-OK', label: 'Oklahoma' },
    { value: 'US-OR', label: 'Oregon' },
    { value: 'US-PA', label: 'Pennsylvania' },
    { value: 'US-RI', label: 'Rhode Island' },
    { value: 'US-SC', label: 'South Carolina' },
    { value: 'US-SD', label: 'South Dakota' },
    { value: 'US-TN', label: 'Tennessee' },
    { value: 'US-TX', label: 'Texas' },
    { value: 'US-UT', label: 'Utah' },
    { value: 'US-VT', label: 'Vermont' },
    { value: 'US-VA', label: 'Virginia' },
    { value: 'US-WA', label: 'Washington' },
    { value: 'US-WV', label: 'West Virginia' },
    { value: 'US-WI', label: 'Wisconsin' },
    { value: 'US-WY', label: 'Wyoming' },
    // Territories
    { value: 'US-AS', label: 'American Samoa' },
    { value: 'US-GU', label: 'Guam' },
    { value: 'US-MP', label: 'Northern Mariana Islands' },
    { value: 'US-PR', label: 'Puerto Rico' },
    { value: 'US-VI', label: 'U.S. Virgin Islands' },
  ],

  // Canada - Provinces and Territories (ISO 3166-2:CA)
  CA: [
    { value: 'CA-AB', label: 'Alberta' },
    { value: 'CA-BC', label: 'British Columbia' },
    { value: 'CA-MB', label: 'Manitoba' },
    { value: 'CA-NB', label: 'New Brunswick' },
    { value: 'CA-NL', label: 'Newfoundland and Labrador' },
    { value: 'CA-NS', label: 'Nova Scotia' },
    { value: 'CA-NT', label: 'Northwest Territories' },
    { value: 'CA-NU', label: 'Nunavut' },
    { value: 'CA-ON', label: 'Ontario' },
    { value: 'CA-PE', label: 'Prince Edward Island' },
    { value: 'CA-QC', label: 'Quebec' },
    { value: 'CA-SK', label: 'Saskatchewan' },
    { value: 'CA-YT', label: 'Yukon' },
  ],

  // Australia - States and Territories (ISO 3166-2:AU)
  AU: [
    { value: 'AU-ACT', label: 'Australian Capital Territory' },
    { value: 'AU-NSW', label: 'New South Wales' },
    { value: 'AU-NT', label: 'Northern Territory' },
    { value: 'AU-QLD', label: 'Queensland' },
    { value: 'AU-SA', label: 'South Australia' },
    { value: 'AU-TAS', label: 'Tasmania' },
    { value: 'AU-VIC', label: 'Victoria' },
    { value: 'AU-WA', label: 'Western Australia' },
  ],

  // United Kingdom - Countries and Regions
  GB: [
    { value: 'GB-ENG', label: 'England' },
    { value: 'GB-NIR', label: 'Northern Ireland' },
    { value: 'GB-SCT', label: 'Scotland' },
    { value: 'GB-WLS', label: 'Wales' },
  ],

  // Germany - Bundesländer (ISO 3166-2:DE)
  DE: [
    { value: 'DE-BW', label: 'Baden-Württemberg' },
    { value: 'DE-BY', label: 'Bayern' },
    { value: 'DE-BE', label: 'Berlin' },
    { value: 'DE-BB', label: 'Brandenburg' },
    { value: 'DE-HB', label: 'Bremen' },
    { value: 'DE-HH', label: 'Hamburg' },
    { value: 'DE-HE', label: 'Hessen' },
    { value: 'DE-MV', label: 'Mecklenburg-Vorpommern' },
    { value: 'DE-NI', label: 'Niedersachsen' },
    { value: 'DE-NW', label: 'Nordrhein-Westfalen' },
    { value: 'DE-RP', label: 'Rheinland-Pfalz' },
    { value: 'DE-SL', label: 'Saarland' },
    { value: 'DE-SN', label: 'Sachsen' },
    { value: 'DE-ST', label: 'Sachsen-Anhalt' },
    { value: 'DE-SH', label: 'Schleswig-Holstein' },
    { value: 'DE-TH', label: 'Thüringen' },
  ],

  // France - Régions (ISO 3166-2:FR)
  FR: [
    { value: 'FR-ARA', label: 'Auvergne-Rhône-Alpes' },
    { value: 'FR-BFC', label: 'Bourgogne-Franche-Comté' },
    { value: 'FR-BRE', label: 'Bretagne' },
    { value: 'FR-CVL', label: 'Centre-Val de Loire' },
    { value: 'FR-COR', label: 'Corse' },
    { value: 'FR-GES', label: 'Grand Est' },
    { value: 'FR-HDF', label: 'Hauts-de-France' },
    { value: 'FR-IDF', label: 'Île-de-France' },
    { value: 'FR-NOR', label: 'Normandie' },
    { value: 'FR-NAQ', label: 'Nouvelle-Aquitaine' },
    { value: 'FR-OCC', label: 'Occitanie' },
    { value: 'FR-PDL', label: 'Pays de la Loire' },
    { value: 'FR-PAC', label: "Provence-Alpes-Côte d'Azur" },
  ],

  // China - Provinces (ISO 3166-2:CN)
  CN: [
    { value: 'CN-BJ', label: '北京市', labelEn: 'Beijing' },
    { value: 'CN-TJ', label: '天津市', labelEn: 'Tianjin' },
    { value: 'CN-HE', label: '河北省', labelEn: 'Hebei' },
    { value: 'CN-SX', label: '山西省', labelEn: 'Shanxi' },
    { value: 'CN-NM', label: '内蒙古自治区', labelEn: 'Inner Mongolia' },
    { value: 'CN-LN', label: '辽宁省', labelEn: 'Liaoning' },
    { value: 'CN-JL', label: '吉林省', labelEn: 'Jilin' },
    { value: 'CN-HL', label: '黑龙江省', labelEn: 'Heilongjiang' },
    { value: 'CN-SH', label: '上海市', labelEn: 'Shanghai' },
    { value: 'CN-JS', label: '江苏省', labelEn: 'Jiangsu' },
    { value: 'CN-ZJ', label: '浙江省', labelEn: 'Zhejiang' },
    { value: 'CN-AH', label: '安徽省', labelEn: 'Anhui' },
    { value: 'CN-FJ', label: '福建省', labelEn: 'Fujian' },
    { value: 'CN-JX', label: '江西省', labelEn: 'Jiangxi' },
    { value: 'CN-SD', label: '山东省', labelEn: 'Shandong' },
    { value: 'CN-HA', label: '河南省', labelEn: 'Henan' },
    { value: 'CN-HB', label: '湖北省', labelEn: 'Hubei' },
    { value: 'CN-HN', label: '湖南省', labelEn: 'Hunan' },
    { value: 'CN-GD', label: '广东省', labelEn: 'Guangdong' },
    { value: 'CN-GX', label: '广西壮族自治区', labelEn: 'Guangxi' },
    { value: 'CN-HI', label: '海南省', labelEn: 'Hainan' },
    { value: 'CN-CQ', label: '重庆市', labelEn: 'Chongqing' },
    { value: 'CN-SC', label: '四川省', labelEn: 'Sichuan' },
    { value: 'CN-GZ', label: '贵州省', labelEn: 'Guizhou' },
    { value: 'CN-YN', label: '云南省', labelEn: 'Yunnan' },
    { value: 'CN-XZ', label: '西藏自治区', labelEn: 'Tibet' },
    { value: 'CN-SN', label: '陕西省', labelEn: 'Shaanxi' },
    { value: 'CN-GS', label: '甘肃省', labelEn: 'Gansu' },
    { value: 'CN-QH', label: '青海省', labelEn: 'Qinghai' },
    { value: 'CN-NX', label: '宁夏回族自治区', labelEn: 'Ningxia' },
    { value: 'CN-XJ', label: '新疆维吾尔自治区', labelEn: 'Xinjiang' },
    { value: 'CN-TW', label: '台湾省', labelEn: 'Taiwan' },
    { value: 'CN-HK', label: '香港特别行政区', labelEn: 'Hong Kong' },
    { value: 'CN-MO', label: '澳门特别行政区', labelEn: 'Macau' },
  ],

  // South Korea - Provinces (ISO 3166-2:KR)
  KR: [
    { value: 'KR-11', label: '서울특별시', labelEn: 'Seoul' },
    { value: 'KR-26', label: '부산광역시', labelEn: 'Busan' },
    { value: 'KR-27', label: '대구광역시', labelEn: 'Daegu' },
    { value: 'KR-28', label: '인천광역시', labelEn: 'Incheon' },
    { value: 'KR-29', label: '광주광역시', labelEn: 'Gwangju' },
    { value: 'KR-30', label: '대전광역시', labelEn: 'Daejeon' },
    { value: 'KR-31', label: '울산광역시', labelEn: 'Ulsan' },
    { value: 'KR-50', label: '세종특별자치시', labelEn: 'Sejong' },
    { value: 'KR-41', label: '경기도', labelEn: 'Gyeonggi' },
    { value: 'KR-42', label: '강원도', labelEn: 'Gangwon' },
    { value: 'KR-43', label: '충청북도', labelEn: 'North Chungcheong' },
    { value: 'KR-44', label: '충청남도', labelEn: 'South Chungcheong' },
    { value: 'KR-45', label: '전라북도', labelEn: 'North Jeolla' },
    { value: 'KR-46', label: '전라남도', labelEn: 'South Jeolla' },
    { value: 'KR-47', label: '경상북도', labelEn: 'North Gyeongsang' },
    { value: 'KR-48', label: '경상남도', labelEn: 'South Gyeongsang' },
    { value: 'KR-49', label: '제주특별자치도', labelEn: 'Jeju' },
  ],
};

// =============================================================================
// Postal Code Patterns
// =============================================================================

export const POSTAL_PATTERNS: Record<string, PostalPattern> = {
  JP: { pattern: /^\d{3}-?\d{4}$/, format: 'NNN-NNNN', example: '100-0001' },
  US: { pattern: /^\d{5}(-\d{4})?$/, format: 'NNNNN or NNNNN-NNNN', example: '90210' },
  CA: { pattern: /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i, format: 'A1A 1A1', example: 'K1A 0B1' },
  GB: { pattern: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i, format: 'AA9A 9AA', example: 'SW1A 1AA' },
  DE: { pattern: /^\d{5}$/, format: 'NNNNN', example: '10115' },
  FR: { pattern: /^\d{5}$/, format: 'NNNNN', example: '75001' },
  AU: { pattern: /^\d{4}$/, format: 'NNNN', example: '2000' },
  CN: { pattern: /^\d{6}$/, format: 'NNNNNN', example: '100000' },
  KR: { pattern: /^\d{5}$/, format: 'NNNNN', example: '03051' },
  IT: { pattern: /^\d{5}$/, format: 'NNNNN', example: '00100' },
  ES: { pattern: /^\d{5}$/, format: 'NNNNN', example: '28001' },
  NL: { pattern: /^\d{4} ?[A-Z]{2}$/i, format: 'NNNN AA', example: '1011 AB' },
  BR: { pattern: /^\d{5}-?\d{3}$/, format: 'NNNNN-NNN', example: '01310-100' },
  IN: { pattern: /^\d{6}$/, format: 'NNNNNN', example: '110001' },
  RU: { pattern: /^\d{6}$/, format: 'NNNNNN', example: '101000' },
};

// =============================================================================
// Widget Alias Mapping
// =============================================================================

/**
 * Widget alias to fixed country code mapping
 * These aliases filter subdivisions to a specific country
 */
export const SUBDIVISION_ALIASES: Record<string, string> = {
  prefecture: 'JP',
  state: 'US',
  province: 'CA',
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get subdivisions for a country
 * @param countryCode - ISO 3166-1 alpha-2 code
 * @returns Subdivision options or empty array
 */
export function getSubdivisions(countryCode: string): SubdivisionOption[] {
  return SUBDIVISIONS[countryCode] || [];
}

/**
 * Get all subdivisions (for when no country is selected)
 * @returns All subdivisions from all countries
 */
export function getAllSubdivisions(): SubdivisionOption[] {
  return Object.values(SUBDIVISIONS).flat();
}

/**
 * Validate postal code for a country
 * @param code - Postal code to validate
 * @param countryCode - ISO 3166-1 alpha-2 code
 * @returns true if valid
 */
export function validatePostalCode(code: string, countryCode: string): boolean {
  const pattern = POSTAL_PATTERNS[countryCode];
  if (!pattern) return true; // No pattern = accept any
  return pattern.pattern.test(code);
}

/**
 * Format Japanese postal code (add hyphen if missing)
 * @param code - Raw postal code
 * @returns Formatted postal code
 */
export function formatJapanesePostalCode(code: string): string {
  const digits = code.replace(/\D/g, '');
  if (digits.length === 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return code;
}

/**
 * Get country code from subdivision code
 * @param subdivisionCode - ISO 3166-2 code (e.g., JP-13)
 * @returns Country code (e.g., JP)
 */
export function getCountryFromSubdivision(subdivisionCode: string): string | undefined {
  const match = subdivisionCode.match(/^([A-Z]{2})-/);
  return match?.[1];
}
