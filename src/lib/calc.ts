/* ==========================================================================
   ENGINEERING CALCULATOR ENGINE
   Formulas follow standard civil/structural practice. Each calculator
   declares its fields and returns a primary result plus supporting values.
   All inputs are in SI unless a field declares otherwise.
   ========================================================================== */

export type FieldType = 'number' | 'select' | 'text';

export interface CalcField {
  key: string;
  label: string; // English
  labelAr: string;
  unit?: string;
  type: FieldType;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string; labelAr: string }[];
  hint?: string;
  default: number | string;
}

export interface CalcResultRow {
  label: string;
  labelAr: string;
  value: string;
  emphasis?: boolean;
}

export interface CalcResult {
  primary: string;
  primaryUnit: string;
  primaryLabel: string;
  primaryLabelAr: string;
  rows: CalcResultRow[];
  note?: string;
  noteAr?: string;
  /** Optional cost roll-up. */
  cost?: number;
}

export type CalcValues = Record<string, number | string>;

export interface Calculator {
  id: string;
  name: string;
  nameAr: string;
  desc: string;
  descAr: string;
  icon: string;
  group: CalcGroup;
  fields: CalcField[];
  compute: (v: CalcValues) => CalcResult;
  standard?: string;
}

export type CalcGroup = 'geometry' | 'concrete' | 'earthworks' | 'utilities' | 'materials' | 'unitconv';

const n = (v: CalcValues, k: string): number => {
  const x = v[k];
  return typeof x === 'number' ? x : Number(x) || 0;
};
const s = (v: CalcValues, k: string): string => String(v[k] ?? '');

/* ------------------------------ quantity helpers ------------------------- */

const round = (x: number, dp = 2): number => {
  const f = 10 ** dp;
  return Math.round((x + Number.EPSILON) * f) / f;
};
const fmt = (x: number, dp = 3): string => {
  if (!Number.isFinite(x)) return '—';
  const abs = Math.abs(x);
  if (abs >= 1_000_000) return `${round(x / 1_000_000, 3)}M`;
  if (abs >= 10_000) return x.toFixed(0);
  if (abs >= 100) return x.toFixed(1);
  if (abs >= 1) return x.toFixed(2);
  if (abs === 0) return '0';
  if (abs >= 0.001) return x.toFixed(4);
  return x.toExponential(2);
};

/* ------------------------------ mix design ------------------------------- */

export interface Mix {
  id: string;
  name: string;
  nameAr: string;
  cement: number;
  sand: number;
  agg: number;
  /** Dry-volume bulking factor. */
  factor: number;
  yieldM3: number;
  grade: string;
}

export const MIXES: Mix[] = [
  { id: '124', name: 'Nominal 1:2:4', nameAr: 'اسمي ١:٢:٤', cement: 1, sand: 2, agg: 4, factor: 1.54, yieldM3: 0.067, grade: 'M15 / M20' },
  { id: '133', name: 'Nominal 1:3:3', nameAr: 'اسمي ١:٣:٣', cement: 1, sand: 3, agg: 3, factor: 1.54, yieldM3: 0.067, grade: 'M20' },
  { id: '125', name: 'Nominal 1:2:5', nameAr: 'اسمي ١:٢:٥', cement: 1, sand: 2, agg: 5, factor: 1.54, yieldM3: 0.062, grade: 'M15' },
  { id: '136', name: 'Nominal 1:3:6', nameAr: 'اسمي ١:٣:٦', cement: 1, sand: 3, agg: 6, factor: 1.54, yieldM3: 0.062, grade: 'M10 / M12' },
  { id: '115', name: 'Lean 1:1:5', nameAr: 'خفيف ١:١:٥', cement: 1, sand: 1, agg: 5, factor: 1.54, yieldM3: 0.062, grade: 'M7.5' },
  { id: '154', name: 'Rich 1:1.5:3', nameAr: 'غني ١:١.٥:٣', cement: 1, sand: 1.5, agg: 3, factor: 1.54, yieldM3: 0.077, grade: 'M25 / M30' },
  { id: '148', name: 'Rich 1:1:4.5', nameAr: 'غني ١:١:٤.٥', cement: 1, sand: 1, agg: 4.5, factor: 1.54, yieldM3: 0.075, grade: 'M25' },
];

const BAG_VOLUME = 0.0347; // m³ per 50 kg cement bag

function mixFor(id: string): Mix {
  return MIXES.find((m) => m.id === id) ?? MIXES[0];
}

/**
 * Quantity of a given material for `wetM3` of finished concrete.
 * Dry volume = wet × 1.54; each part = dry / Σratio.
 */
function mixQuantities(wetM3: number, mix: Mix) {
  const dry = wetM3 * mix.factor;
  const sum = mix.cement + mix.sand + mix.agg;
  const cementM3 = (dry * mix.cement) / sum;
  const sandM3 = (dry * mix.sand) / sum;
  const aggM3 = (dry * mix.agg) / sum;
  const waterL = wetM3 * 180; // nominal 180 L/m³ incl. admixture correction
  return {
    wetM3,
    dryM3: dry,
    cementBags: cementM3 / BAG_VOLUME,
    cementTon: (cementM3 * 1440) / 1000, // OPC bulk density 1440 kg/m³
    sandM3,
    sandTon: (sandM3 * 1600) / 1000,
    aggM3,
    aggTon: (aggM3 * 1750) / 1000,
    waterL,
  };
}

/* ------------------------------- calculators ----------------------------- */

const area: Calculator = {
  id: 'area',
  name: 'Area',
  nameAr: 'المساحة',
  desc: 'Areas of regular and composite plan shapes with perimeter.',
  descAr: 'مساحات الأشكال المنتظمة والمركبة مع المحيط.',
  icon: 'square',
  group: 'geometry',
  fields: [
    { key: 'shape', label: 'Shape', labelAr: 'الشكل', type: 'select', default: 'rect',
      options: [
        { value: 'rect', label: 'Rectangle', labelAr: 'مستطيل' },
        { value: 'square', label: 'Square', labelAr: 'مربع' },
        { value: 'tri', label: 'Triangle (base × height)', labelAr: 'مثلث (القاعدة × الارتفاع)' },
        { value: 'trap', label: 'Trapezoid', labelAr: 'شبه منحرف' },
        { value: 'circle', label: 'Circle', labelAr: 'دائرة' },
        { value: 'ring', label: 'Annulus (ring)', labelAr: 'حلقة' },
        { value: 'lshape', label: 'L-shape', labelAr: 'شكل ل' },
        { value: 'sector', label: 'Circular segment (sector)', labelAr: 'قطاع دائري' },
      ] },
    { key: 'a', label: 'Length A', labelAr: 'الطول أ', unit: 'm', type: 'number', min: 0, step: 0.01, default: 20 },
    { key: 'b', label: 'Length B', labelAr: 'العرض ب', unit: 'm', type: 'number', min: 0, step: 0.01, default: 12 },
    { key: 'c', label: 'Length C (trapezoid top / L inner)', labelAr: 'الطول ج', unit: 'm', type: 'number', min: 0, step: 0.01, default: 14 },
    { key: 'd', label: 'Length D (trapezoid depth / L width)', labelAr: 'الطول د', unit: 'm', type: 'number', min: 0, step: 0.01, default: 8 },
    { key: 'r', label: 'Radius', labelAr: 'نصف القطر', unit: 'm', type: 'number', min: 0, step: 0.01, default: 5 },
    { key: 't', label: 'Ring thickness', labelAr: 'سماكة الحلقة', unit: 'm', type: 'number', min: 0, step: 0.01, default: 0.5 },
    { key: 'ang', label: 'Angle', labelAr: 'الزاوية', unit: '°', type: 'number', min: 0, max: 360, step: 1, default: 90 },
  ],
  compute(v) {
    const shape = s(v, 'shape');
    const a = n(v, 'a');
    const b = n(v, 'b');
    const c = n(v, 'c');
    const d = n(v, 'd');
    const r = n(v, 'r');
    const t = n(v, 't');
    const ang = n(v, 'ang');
    let areaM2 = 0;
    let perim = 0;

    switch (shape) {
      case 'square':
        areaM2 = a * a;
        perim = 4 * a;
        break;
      case 'tri':
        areaM2 = (a * b) / 2;
        perim = a + b + Math.hypot(a, b);
        break;
      case 'trap':
        areaM2 = ((a + c) * b) / 2;
        perim = a + c + 2 * Math.hypot((a - c) / 2, b);
        break;
      case 'circle':
        areaM2 = Math.PI * r * r;
        perim = 2 * Math.PI * r;
        break;
      case 'ring':
        areaM2 = Math.PI * (r * r - (r - t) * (r - t));
        perim = 2 * Math.PI * r + 2 * Math.PI * (r - t);
        break;
      case 'lshape':
        areaM2 = a * b - c * d;
        perim = a + b + c + d + Math.hypot(c, d) + Math.hypot(a - c, b - d);
        break;
      case 'sector':
        areaM2 = (Math.PI * r * r * ang) / 360;
        perim = 2 * r + (Math.PI * r * ang) / 180;
        break;
      default:
        areaM2 = a * b;
        perim = 2 * (a + b);
    }

    return {
      primary: fmt(areaM2),
      primaryUnit: 'm²',
      primaryLabel: 'Area',
      primaryLabelAr: 'المساحة',
      rows: [
        { label: 'Area', labelAr: 'المساحة', value: `${fmt(areaM2)} m²` },
        { label: 'Perimeter', labelAr: 'المحيط', value: `${fmt(perim)} m` },
        { label: 'Hectares', labelAr: 'الهكتار', value: `${fmt(areaM2 / 10000, 4)} ha` },
        { label: 'Square feet', labelAr: 'قدم مربع', value: `${fmt(areaM2 * 10.7639, 1)} ft²` },
        { label: 'Cubic volume @ 100 mm', labelAr: 'حجم عند ١٠٠ مم', value: `${fmt((areaM2 * 0.1), 3)} m³` },
      ],
      note: 'Area × 0.10 m gives the concrete volume for a 100 mm floor slab.',
    };
  },
};

const volume: Calculator = {
  id: 'volume',
  name: 'Volume',
  nameAr: 'الحجم',
  desc: 'Volumes of solids, tanks, pipes and irregular sections.',
  descAr: 'أحجام المجسمات والخزانات والأنابيب والأشكال غير المنتظمة.',
  icon: 'cube',
  group: 'geometry',
  fields: [
    { key: 'shape', label: 'Shape', labelAr: 'الشكل', type: 'select', default: 'box',
      options: [
        { value: 'box', label: 'Rectangular box', labelAr: 'صندوق مستطيل' },
        { value: 'cyl', label: 'Cylinder / tank', labelAr: 'أسطوانة / خزان' },
        { value: 'cone', label: 'Cone', labelAr: 'مخروط' },
        { value: 'sphere', label: 'Sphere / dome', labelAr: 'كرة / قبة' },
        { value: 'tri', label: 'Triangular prism', labelAr: 'منشور ثلاثي' },
        { value: 'pipe', label: 'Pipe (annular)', labelAr: 'أنبوب (حلقي)' },
        { value: 'frustum', label: 'Truncated cone (hopper)', labelAr: 'مخروط ناقص (قمع)' },
      ] },
    { key: 'l', label: 'Length', labelAr: 'الطول', unit: 'm', type: 'number', min: 0, step: 0.01, default: 10 },
    { key: 'w', label: 'Width', labelAr: 'العرض', unit: 'm', type: 'number', min: 0, step: 0.01, default: 4 },
    { key: 'h', label: 'Height / Depth', labelAr: 'الارتفاع / العمق', unit: 'm', type: 'number', min: 0, step: 0.01, default: 2 },
    { key: 'r', label: 'Outer radius', labelAr: 'نصف القطر الخارجي', unit: 'm', type: 'number', min: 0, step: 0.01, default: 1.5 },
    { key: 't', label: 'Wall thickness', labelAr: 'سماكة الجدار', unit: 'm', type: 'number', min: 0, step: 0.005, default: 0.15 },
  ],
  compute(v) {
    const shape = s(v, 'shape');
    const l = n(v, 'l');
    const w = n(v, 'w');
    const h = n(v, 'h');
    const r = n(v, 'r');
    const t = n(v, 't');
    let vol = 0;
    let surf = 0;

    switch (shape) {
      case 'cyl':
        vol = Math.PI * r * r * h;
        surf = 2 * Math.PI * r * h + 2 * Math.PI * r * r;
        break;
      case 'cone':
        vol = (Math.PI * r * r * h) / 3;
        surf = Math.PI * r * Math.hypot(r, h) + Math.PI * r * r;
        break;
      case 'sphere':
        vol = (4 / 3) * Math.PI * r ** 3;
        surf = 4 * Math.PI * r * r;
        break;
      case 'tri':
        vol = (l * w * h) / 2;
        surf = 2 * ((l * w) / 2) + l * h + w * h;
        break;
      case 'pipe': {
        const ri = Math.max(0, r - t);
        vol = Math.PI * (r * r - ri * ri) * l;
        surf = 2 * Math.PI * r * l + 2 * Math.PI * ri * l;
        break;
      }
      case 'frustum':
        vol = (Math.PI * h / 3) * (r * r + r * (r - t) + (r - t) * (r - t));
        surf = Math.PI * (r + (r - t)) * Math.hypot(t, h);
        break;
      default:
        vol = l * w * h;
        surf = 2 * (l * w + l * h + w * h);
    }

    const litres = vol * 1000;
    return {
      primary: fmt(vol),
      primaryUnit: 'm³',
      primaryLabel: 'Volume',
      primaryLabelAr: 'الحجم',
      rows: [
        { label: 'Volume', labelAr: 'الحجم', value: `${fmt(vol)} m³`, emphasis: true },
        { label: 'Litres', labelAr: 'لتر', value: `${fmt(litres, 1)} L` },
        { label: 'Surface area', labelAr: 'مساحة السطح', value: `${fmt(surf)} m²` },
        { label: 'Cubic feet', labelAr: 'قدم مكعب', value: `${fmt(vol * 35.3147, 2)} ft³` },
        { label: 'Formwork ratio (surf ÷ vol)', labelAr: 'نسبة القوالب', value: `${fmt(surf / Math.max(vol, 0.0001), 2)} : 1` },
      ],
      note: 'Formwork area divided by volume gives the shuttering ratio used for estimating.',
    };
  },
};

const concrete: Calculator = {
  id: 'concrete',
  name: 'Concrete Quantity',
  nameAr: 'كمية الخرسانة',
  desc: 'Concrete volume and full material take-off for a structural element.',
  descAr: 'حجم الخرسانة وحساب كامل المواد لعنصر إنشائي.',
  icon: 'concrete',
  group: 'concrete',
  standard: 'IS 456 / ACI 211 / BS 8500',
  fields: [
    { key: 'element', label: 'Element', labelAr: 'العنصر', type: 'select', default: 'slab',
      options: [
        { value: 'slab', label: 'Slab / raft', labelAr: 'بلاطة / لوح أساس' },
        { value: 'footing', label: 'Isolated footing', labelAr: 'منسوب منفصل' },
        { value: 'column', label: 'Column', labelAr: 'عمود' },
        { value: 'beam', label: 'Beam', labelAr: 'كمرة' },
        { value: 'wall', label: 'Wall', labelAr: 'جدار' },
        { value: 'stair', label: 'Stair (flight)', labelAr: 'درج' },
        { value: 'custom', label: 'Custom (direct volume)', labelAr: 'مخصص (حجم مباشر)' },
      ] },
    { key: 'count', label: 'Number of units', labelAr: 'عدد الوحدات', type: 'number', min: 1, step: 1, default: 1 },
    { key: 'l', label: 'Length', labelAr: 'الطول', unit: 'm', type: 'number', min: 0, step: 0.01, default: 10 },
    { key: 'w', label: 'Width', labelAr: 'العرض', unit: 'm', type: 'number', min: 0, step: 0.01, default: 6 },
    { key: 'h', label: 'Thickness / Depth', labelAr: 'السماكة / العمق', unit: 'm', type: 'number', min: 0, step: 0.005, default: 0.2 },
    { key: 'b', label: 'Beam / Wall width', labelAr: 'عرض الكمرة / الجدار', unit: 'm', type: 'number', min: 0, step: 0.01, default: 0.3 },
    { key: 'd', label: 'Beam / Wall depth', labelAr: 'عمق الكمرة / الجدار', unit: 'm', type: 'number', min: 0, step: 0.01, default: 0.6 },
    { key: 'rise', label: 'Stair rise (total)', labelAr: 'ارتفاع الدرج الكلي', unit: 'm', type: 'number', min: 0, step: 0.01, default: 3 },
    { key: 'going', label: 'Stair going', labelAr: 'عرض الدرجة', unit: 'm', type: 'number', min: 0, step: 0.01, default: 0.28 },
    { key: 'width', label: 'Stair width', labelAr: 'عرض الدرج', unit: 'm', type: 'number', min: 0, step: 0.01, default: 1.2 },
    { key: 'direct', label: 'Direct volume per unit', labelAr: 'الحجم المباشر للوحدة', unit: 'm³', type: 'number', min: 0, step: 0.01, default: 10 },
    { key: 'mix', label: 'Mix design', labelAr: 'تصميم الخلطة', type: 'select', default: '148',
      options: MIXES.map((m) => ({ value: m.id, label: `${m.name} (${m.grade})`, labelAr: `${m.nameAr} (${m.grade})` })) },
    { key: 'wastage', label: 'Wastage allowance', labelAr: 'نسبة الهدر', unit: '%', type: 'number', min: 0, max: 30, step: 0.5, default: 5 },
    { key: 'rateC', label: 'Cement rate', labelAr: 'سعر الأسمنت', unit: 'SAR/bag', type: 'number', min: 0, step: 0.1, default: 19.4 },
    { key: 'rateS', label: 'Sand rate', labelAr: 'سعر الرمل', unit: 'SAR/m³', type: 'number', min: 0, step: 1, default: 62 },
    { key: 'rateA', label: 'Aggregate rate', labelAr: 'سعر الركام', unit: 'SAR/m³', type: 'number', min: 0, step: 1, default: 78 },
    { key: 'rateMix', label: 'Ready-mix rate (optional)', labelAr: 'سعر الخرسانة الجاهزة (اختياري)', unit: 'SAR/m³', type: 'number', min: 0, step: 1, default: 0 },
  ],
  compute(v) {
    const el = s(v, 'element');
    const count = Math.max(1, n(v, 'count'));
    const l = n(v, 'l');
    const w = n(v, 'w');
    const h = n(v, 'h');
    const b = n(v, 'b');
    const d = n(v, 'd');
    const mix = mixFor(s(v, 'mix'));
    const wastage = 1 + n(v, 'wastage') / 100;
    const rateC = n(v, 'rateC');
    const rateS = n(v, 'rateS');
    const rateA = n(v, 'rateA');
    const rateMix = n(v, 'rateMix');

    let perUnit = 0;
    let formwork = 0;
    switch (el) {
      case 'slab':
        perUnit = l * w * h;
        formwork = 2 * (l * w);
        break;
      case 'footing':
        perUnit = l * w * h;
        formwork = 2 * h * (l + w) + l * w;
        break;
      case 'column':
        perUnit = l * w * h;
        formwork = 2 * (l + w) * h;
        break;
      case 'beam':
        perUnit = l * b * d;
        formwork = 2 * l * d + 2 * l * b;
        break;
      case 'wall':
        perUnit = l * b * h;
        formwork = 2 * l * h;
        break;
      case 'stair': {
        const steps = Math.max(1, Math.round(n(v, 'rise') / 0.175));
        const going = n(v, 'going');
        const width = n(v, 'width');
        perUnit = (steps * going * width * 0.15) / 2;
        formwork = 0;
        break;
      }
      default:
        perUnit = n(v, 'direct');
    }

    const net = perUnit * count;
    const gross = net * wastage;
    const q = mixQuantities(gross, mix);

    const siteCost = q.cementBags * rateC + q.sandM3 * rateS + q.aggM3 * rateA;
    const rmCost = rateMix > 0 ? gross * rateMix : 0;
    const chosen = rateMix > 0 ? rmCost : siteCost;

    const rows: CalcResultRow[] = [
      { label: 'Net volume', labelAr: 'الحجم الصافي', value: `${fmt(net)} m³` },
      { label: `Volume incl. ${n(v, 'wastage')}% wastage`, labelAr: `الحجم مع ${n(v, 'wastage')}% هدر`, value: `${fmt(gross)} m³`, emphasis: true },
      { label: 'Mix (dry vol × 1.54)', labelAr: 'الخلطة (جاف × ١.٥٤)', value: `${fmt(q.dryM3)} m³` },
      { label: 'Cement', labelAr: 'أسمنت', value: `${fmt(q.cementBags, 1)} bags (${fmt(q.cementTon, 2)} t)` },
      { label: 'Sand', labelAr: 'رمل', value: `${fmt(q.sandM3)} m³ (${fmt(q.sandTon, 2)} t)` },
      { label: 'Coarse aggregate', labelAr: 'ركام خشن', value: `${fmt(q.aggM3)} m³ (${fmt(q.aggTon, 2)} t)` },
      { label: 'Water', labelAr: 'ماء', value: `${fmt(q.waterL, 0)} L (w/c ≈ 0.55 nominal)` },
      { label: 'Formwork area', labelAr: 'مساحة القوالب', value: `${fmt(formwork * count)} m²` },
    ];

    if (rateMix > 0) {
      rows.push({ label: 'Ready-mix supply cost', labelAr: 'تكلفة الخرسانة الجاهزة', value: `${fmt(rmCost, 0)} SAR` });
    }
    rows.push({
      label: rateMix > 0 ? 'Rate per m³ (supply only)' : 'Site-mix material cost',
      labelAr: rateMix > 0 ? 'سعر المتر المكعب (توريد فقط)' : 'تكلفة مواد الخلطة في الموقع',
      value: rateMix > 0
        ? `${fmt(rmCost / Math.max(gross, 0.0001), 2)} SAR/m³`
        : `${fmt(siteCost, 0)} SAR total`,
      emphasis: true,
    });

    return {
      primary: fmt(gross),
      primaryUnit: 'm³',
      primaryLabel: 'Total concrete volume',
      primaryLabelAr: 'إجمالي حجم الخرسانة',
      rows,
      cost: chosen,
      note:
        'Dry volume factor 1.54 converts wet (placed) volume to the loose material volume used for batching. Cement bag = 0.0347 m³. Verify against the approved mix design before ordering.',
      noteAr:
        'معامل الحجم الجاف ١.٥٤ يحوّل الحجم الرطب إلى حجم المواد المفكوك. كيس الأسمنت = ٠.٠٣٤٧ م³. يجب التحقق من تصميم الخلطة المعتمد قبل الطلب.',
    };
  },
};

const excavation: Calculator = {
  id: 'excavation',
  name: 'Excavation Volume',
  nameAr: 'حفر',
  desc: 'Bulk excavation with swell factor, benching and haulage.',
  descAr: 'الحفر الكتلي مع معامل الانتفاخ، والمِنحدرات، والنقل.',
  icon: 'excavate',
  group: 'earthworks',
  standard: 'Standard earthworks quantities',
  fields: [
    { key: 'shape', label: 'Excavation type', labelAr: 'نوع الحفر', type: 'select', default: 'trench',
      options: [
        { value: 'trench', label: 'Trench (uniform section)', labelAr: 'خندق (مقطع منتظم)' },
        { value: 'pit', label: 'Rectangular pit', labelAr: 'حفرة مستطيلة' },
        { value: 'footing', label: 'Isolated footing', labelAr: 'منسوب منفصل' },
        { value: 'slope', label: 'Sloped / benched excavation', labelAr: 'حفر مائل / على مصاطب' },
      ] },
    { key: 'l', label: 'Length', labelAr: 'الطول', unit: 'm', type: 'number', min: 0, step: 0.01, default: 60 },
    { key: 'w', label: 'Top width', labelAr: 'العرض العلوي', unit: 'm', type: 'number', min: 0, step: 0.01, default: 2.4 },
    { key: 'd', label: 'Bottom width', labelAr: 'العرض السفلي', unit: 'm', type: 'number', min: 0, step: 0.01, default: 1.2 },
    { key: 'h', label: 'Depth', labelAr: 'العمق', unit: 'm', type: 'number', min: 0, step: 0.01, default: 2.2 },
    { key: 'slope', label: 'Batter slope (1 : n)', labelAr: 'ميل الانحدار (١ : ن)', type: 'number', min: 0, max: 4, step: 0.05, default: 0.5 },
    { key: 'swell', label: 'Swell factor', labelAr: 'معامل الانتفاخ', unit: '×', type: 'number', min: 1, max: 2, step: 0.01, default: 1.25 },
    { key: 'rateExc', label: 'Excavation rate', labelAr: 'سعر الحفر', unit: 'SAR/m³', type: 'number', min: 0, step: 1, default: 18 },
    { key: 'rateHaul', label: 'Haulage rate', labelAr: 'سعر النقل', unit: 'SAR/m³', type: 'number', min: 0, step: 1, default: 12 },
  ],
  compute(v) {
    const shape = s(v, 'shape');
    const l = n(v, 'l');
    const w = n(v, 'w');
    const d = n(v, 'd');
    const h = n(v, 'h');
    const slope = n(v, 'slope');
    const swell = n(v, 'swell');
    const rateExc = n(v, 'rateExc');
    const rateHaul = n(v, 'rateHaul');

    let bank = 0;
    let surface = 0;
    if (shape === 'trench') {
      bank = l * w * h;
      surface = l * (w + 2 * slope * h);
    } else if (shape === 'pit') {
      bank = l * w * h;
      surface = 2 * (l + w) * h;
    } else if (shape === 'footing') {
      bank = l * w * h;
      surface = (l + w) * 2 * h;
    } else {
      // Sloped section, area by trapezoidal prism formula.
      const areaAvg = ((w + d) / 2) * h;
      bank = l * areaAvg;
      surface = l * (w + d + 2 * Math.hypot((w - d) / 2, h));
    }

    const loose = bank * swell;
    const cost = bank * rateExc + loose * rateHaul;
    const trucks = Math.ceil(loose / 12); // ~12 m³ per 20 t tipper

    return {
      primary: fmt(bank),
      primaryUnit: 'm³',
      primaryLabel: 'Bank (in-situ) volume',
      primaryLabelAr: 'الحجم الطبيعي',
      rows: [
        { label: 'Bank volume (in situ)', labelAr: 'الحجم الطبيعي', value: `${fmt(bank)} m³`, emphasis: true },
        { label: 'Loose volume after swell', labelAr: 'الحجم المفكوك بعد الانتفاخ', value: `${fmt(loose)} m³` },
        { label: 'Top surface area', labelAr: 'مساحة السطح العلوي', value: `${fmt(surface)} m²` },
        { label: 'Backfill to estimate', labelAr: 'الحشو التقديري', value: `${fmt(bank * 0.35)} m³` },
        { label: 'Tipper loads (12 m³)', labelAr: 'عدد النقلات (١٢ م³)', value: `${trucks}` },
        { label: 'Excavation cost', labelAr: 'تكلفة الحفر', value: `${fmt(bank * rateExc, 0)} SAR` },
        { label: 'Haulage cost', labelAr: 'تكلفة النقل', value: `${fmt(loose * rateHaul, 0)} SAR` },
        { label: 'Total cost', labelAr: 'الإجمالي', value: `${fmt(cost, 0)} SAR`, emphasis: true },
      ],
      cost,
      note: `Swell factor ${swell} increases the volume for cartage. Bank measure is the in-situ quantity used for payment.`,
    };
  },
};

const percentage: Calculator = {
  id: 'percentage',
  name: 'Percentage',
  nameAr: 'النسبة المئوية',
  desc: 'Percentage change, share, mark-up and retention.',
  descAr: 'التغير والنسبة والزيادة والخصم.',
  icon: 'percent',
  group: 'utilities',
  fields: [
    { key: 'mode', label: 'Operation', labelAr: 'العملية', type: 'select', default: 'change',
      options: [
        { value: 'change', label: 'Percentage change', labelAr: 'النسبة المئوية للتغير' },
        { value: 'of', label: 'X is what % of Y', labelAr: 'س هو كم بالمئة من ص' },
        { value: 'add', label: 'Add % to a value', labelAr: 'إضافة نسبة إلى قيمة' },
        { value: 'deduct', label: 'Deduct % from a value', labelAr: 'خصم نسبة من قيمة' },
        { value: 'markup', label: 'Mark-up on cost', labelAr: 'زيادة على التكلفة' },
        { value: 'retain', label: 'Retention / withholding', labelAr: 'الخصم المحتجز' },
        { value: 'split', label: 'Split a value by %', labelAr: 'تقسيم قيمة بنسبة' },
      ] },
    { key: 'a', label: 'Value A', labelAr: 'القيمة أ', type: 'number', step: 0.01, default: 125000 },
    { key: 'b', label: 'Value B', labelAr: 'القيمة ب', type: 'number', step: 0.01, default: 100000 },
    { key: 'p', label: 'Percentage', labelAr: 'النسبة', unit: '%', type: 'number', min: -1000, max: 1000, step: 0.01, default: 12.5 },
  ],
  compute(v) {
    const mode = s(v, 'mode');
    const a = n(v, 'a');
    const b = n(v, 'b');
    const p = n(v, 'p');
    let primary = 0;
    let unit = '%';
    let label = 'Result';
    let labelAr = 'النتيجة';
    const rows: CalcResultRow[] = [];

    switch (mode) {
      case 'change': {
        if (b === 0) break;
        primary = ((a - b) / b) * 100;
        rows.push(
          { label: 'Absolute change', labelAr: 'التغير المطلق', value: `${fmt(a - b, 2)}` },
          { label: 'New value', labelAr: 'القيمة الجديدة', value: `${fmt(a, 2)}` },
          { label: 'Direction', labelAr: 'الاتجاه', value: a >= b ? 'Increase' : 'Decrease' },
        );
        break;
      }
      case 'of': {
        if (b === 0) break;
        primary = (a / b) * 100;
        rows.push({ label: 'Complement', labelAr: 'المتبقي', value: `${fmt(100 - primary, 3)}%` });
        break;
      }
      case 'add':
        primary = a * (1 + p / 100);
        unit = '';
        label = 'Value after increase';
        labelAr = 'القيمة بعد الزيادة';
        rows.push({ label: 'Increase amount', labelAr: 'مقدار الزيادة', value: `${fmt((a * p) / 100, 2)}` });
        break;
      case 'deduct':
        primary = a * (1 - p / 100);
        unit = '';
        label = 'Value after deduction';
        labelAr = 'القيمة بعد الخصم';
        rows.push({ label: 'Deduction amount', labelAr: 'مقدار الخصم', value: `${fmt((a * p) / 100, 2)}` });
        break;
      case 'markup':
        primary = a * (1 + p / 100);
        unit = '';
        label = 'Selling price';
        labelAr = 'سعر البيع';
        rows.push(
          { label: 'Cost', labelAr: 'التكلفة', value: `${fmt(a, 2)}` },
          { label: 'Margin', labelAr: 'هامش الربح', value: `${fmt((a * p) / 100, 2)}` },
        );
        break;
      case 'retain':
        primary = a * (1 - p / 100);
        unit = '';
        label = 'Net after retention';
        labelAr: 'الصافي بعد الخصم';
        rows.push({
          label: 'Retention held',
          labelAr: 'المبلغ المحتجز',
          value: `${fmt((a * p) / 100, 2)}`,
        });
        break;
      case 'split':
        primary = (a * p) / 100;
        unit = '';
        label = 'Portion';
        labelAr = 'الحصة';
        rows.push({
          label: 'Balance',
          labelAr: 'المتبقي',
          value: `${fmt(a - primary, 2)} (${fmt(100 - p, 2)}%)`,
        });
        break;
    }

    return {
      primary: unit === '%' ? fmt(primary, 3) : fmt(primary, 2),
      primaryUnit: unit,
      primaryLabel: label,
      primaryLabelAr: labelAr,
      rows,
    };
  },
};

const unitconv: Calculator = {
  id: 'unitconv',
  name: 'Unit Conversion',
  nameAr: 'تحويل الوحدات',
  desc: 'Metric, Imperial and construction units across 9 quantities.',
  descAr: 'الوحدات المترية والإمبراطورية في ٩ كميات.',
  icon: 'swap',
  group: 'unitconv',
  fields: [
    { key: 'cat', label: 'Quantity', labelAr: 'الكمية', type: 'select', default: 'length',
      options: [
        { value: 'length', label: 'Length', labelAr: 'الطول' },
        { value: 'area', label: 'Area', labelAr: 'المساحة' },
        { value: 'volume', label: 'Volume', labelAr: 'الحجم' },
        { value: 'mass', label: 'Mass / Weight', labelAr: 'الكتلة' },
        { value: 'speed', label: 'Speed', labelAr: 'السرعة' },
        { value: 'pressure', label: 'Pressure / Stress', labelAr: 'الضغط' },
        { value: 'force', label: 'Force', labelAr: 'القوة' },
        { value: 'time', label: 'Time / Rate', labelAr: 'الزمن' },
        { value: 'angle', label: 'Angle', labelAr: 'الزاوية' },
      ] },
    { key: 'value', label: 'Value', labelAr: 'القيمة', type: 'number', step: 0.0001, default: 1 },
  ],
  compute(v) {
    const cat = s(v, 'cat');
    const value = n(v, 'value');
    const table: Record<string, { from: string; to: string; factor: number }[]> = {
      length: [
        { from: 'mm', to: 'm', factor: 0.001 }, { from: 'm', to: 'mm', factor: 1000 },
        { from: 'm', to: 'cm', factor: 100 }, { from: 'm', to: 'km', factor: 0.001 },
        { from: 'm', to: 'in', factor: 39.3701 }, { from: 'm', to: 'ft', factor: 3.28084 },
        { from: 'm', to: 'yd', factor: 1.09361 }, { from: 'm', to: 'chain', factor: 0.04971 },
        { from: 'km', to: 'mi', factor: 0.621371 }, { from: 'm', to: 'fathom', factor: 0.546807 },
      ],
      area: [
        { from: 'm²', to: 'ft²', factor: 10.7639 }, { from: 'm²', to: 'ft', factor: 10.7639 },
        { from: 'm²', to: 'acre', factor: 0.000247105 }, { from: 'm²', to: 'ha', factor: 0.0001 },
        { from: 'm²', to: 'km²', factor: 0.000001 }, { from: 'ft²', to: 'm²', factor: 0.092903 },
        { from: 'acre', to: 'm²', factor: 4046.86 }, { from: 'km²', to: 'acre', factor: 247.105 },
        { from: 'm²', to: 'yd²', factor: 1.19599 }, { from: 'ft²', to: 'ft', factor: 1 },
      ],
      volume: [
        { from: 'm³', to: 'ft³', factor: 35.3147 }, { from: 'm³', to: 'litre', factor: 1000 },
        { from: 'm³', to: 'cm³', factor: 1e6 }, { from: 'm³', to: 'yd³', factor: 1.30795 },
        { from: 'ft³', to: 'm³', factor: 0.0283168 }, { from: 'litre', to: 'm³', factor: 0.001 },
        { from: 'm³', to: 'US gal', factor: 264.172 }, { from: 'm³', to: 'bbl (oil)', factor: 6.28981 },
        { from: 'm³', to: 'imp gal', factor: 219.969 }, { from: 'cm³', to: 'litre', factor: 0.001 },
      ],
      mass: [
        { from: 'kg', to: 'ton', factor: 0.001 }, { from: 'ton', to: 'kg', factor: 1000 },
        { from: 'kg', to: 'lb', factor: 2.20462 }, { from: 'lb', to: 'kg', factor: 0.453592 },
        { from: 'ton', to: 'lb', factor: 2204.62 }, { from: 'ton', to: 'short ton', factor: 1.10231 },
        { from: 'kg', to: 'g', factor: 1000 }, { from: 'ton', to: 'tonne', factor: 1 },
        { from: 'kg', to: 'quintal', factor: 0.01 }, { from: 'ton', to: 'kN (weight)', factor: 9.80665 },
      ],
      speed: [
        { from: 'km/h', to: 'mph', factor: 0.621371 }, { from: 'km/h', to: 'm/s', factor: 0.277778 },
        { from: 'mph', to: 'km/h', factor: 1.60934 }, { from: 'm/s', to: 'km/h', factor: 3.6 },
        { from: 'km/h', to: 'ft/s', factor: 0.911344 }, { from: 'kn', to: 'km/h', factor: 1.852 },
        { from: 'm/min', to: 'm/s', factor: 0.0166667 },
      ],
      pressure: [
        { from: 'kPa', to: 'MPa', factor: 0.001 }, { from: 'MPa', to: 'kPa', factor: 1000 },
        { from: 'kPa', to: 'bar', factor: 0.01 }, { from: 'kPa', to: 'psi', factor: 0.145038 },
        { from: 'kPa', to: 'kg/cm²', factor: 0.0101972 }, { from: 'bar', to: 'psi', factor: 14.5038 },
        { from: 'kPa', to: 'kN/m²', factor: 1 }, { from: 'psi', to: 'MPa', factor: 0.00689476 },
        { from: 'kg/cm²', to: 'MPa', factor: 0.0980665 },
      ],
      force: [
        { from: 'kN', to: 'N', factor: 1000 }, { from: 'kN', to: 'lbf', factor: 224.809 },
        { from: 'kN', to: 'kgf', factor: 101.972 }, { from: 'kN', to: 'ton-force', factor: 0.101972 },
        { from: 'lbf', to: 'N', factor: 4.44822 }, { from: 'N', to: 'kN', factor: 0.001 },
        { from: 'kN', to: 'MN', factor: 0.001 },
      ],
      time: [
        { from: 'hour', to: 'min', factor: 60 }, { from: 'day', to: 'hour', factor: 24 },
        { from: 'week', to: 'day', factor: 7 }, { from: 'day', to: 'week', factor: 1 / 7 },
        { from: 'year', to: 'day', factor: 365.25 }, { from: 'min', to: 'second', factor: 60 },
        { from: 'shift (8 h)', to: 'hour', factor: 8 }, { from: 'month', to: 'day', factor: 30.44 },
      ],
      angle: [
        { from: 'degree', to: 'radian', factor: Math.PI / 180 },
        { from: 'radian', to: 'degree', factor: 180 / Math.PI },
        { from: 'degree', to: 'grad', factor: 10 / 9 },
        { from: 'grad', to: 'degree', factor: 0.9 },
        { from: 'degree', to: 'minute', factor: 60 },
        { from: 'minute', to: 'second', factor: 60 },
      ],
    };

    const rows = (table[cat] ?? table.length).map((c) => ({
      label: `1 ${c.from} → ${c.to}`,
      labelAr: `١ ${c.from} ← ${c.to}`,
      value: `${value} ${c.from} = ${fmt(value * c.factor, 6)} ${c.to}`,
    }));

    return {
      primary: fmt(value, 6),
      primaryUnit: '',
      primaryLabel: `Value in ${cat}`,
      primaryLabelAr: `القيمة بوحدة ${cat}`,
      rows,
    };
  },
};

const lengthCalc: Calculator = {
  id: 'length',
  name: 'Length & Chainage',
  nameAr: 'الطول والجراد',
  desc: 'Chainage arithmetic, stationing, cut and fill check.',
  descAr: 'حسابات الجراد والتدريج وفرق الحفر والردم.',
  icon: 'ruler',
  group: 'utilities',
  fields: [
    { key: 'mode', label: 'Operation', labelAr: 'العملية', type: 'select', default: 'add',
      options: [
        { value: 'add', label: 'Add a length to a chainage', labelAr: 'إضافة طول إلى جراد' },
        { value: 'sub', label: 'Subtract a length', labelAr: 'طرح طول' },
        { value: 'interval', label: 'Intervals between two chainages', labelAr: 'الفواصل بين جرادين' },
        { value: 'mid', label: 'Midpoint chainage', labelAr: 'جراد المنتصف' },
        { value: 'stn', label: 'Convert chainage ↔ station', labelAr: 'تحويل الجراد إلى تدريج' },
      ] },
    { key: 'a', label: 'Chainage A (e.g. 4+250)', labelAr: 'الجراد أ', type: 'text', default: '4+250' },
    { key: 'b', label: 'Length B / Chainage B', labelAr: 'الطول ب / الجراد ب', type: 'text', default: '125.50' },
  ],
  compute(v) {
    const mode = s(v, 'mode');
    const parseCh = (x: string): number => {
      const t = String(x).trim();
      if (t.includes('+')) {
        const [a, b] = t.split('+');
        return Number(a) * 1000 + Number(b);
      }
      return Number(t);
    };
    const fmtCh = (metres: number) => {
      if (!Number.isFinite(metres)) return '—';
      const sign = metres < 0 ? '-' : '';
      const abs = Math.abs(metres);
      const km = Math.floor(abs / 1000);
      const rem = abs - km * 1000;
      return `${sign}${km}+${rem.toFixed(3)}`;
    };

    const a = parseCh(s(v, 'a'));
    const b = parseCh(s(v, 'b'));
    const rows: CalcResultRow[] = [];
    let primary = 0;
    let label = 'Chainage';
    let labelAr = 'الجراد';

    switch (mode) {
      case 'add':
        primary = a + b;
        label = 'New chainage';
        labelAr = 'الجراد الجديد';
        rows.push(
          { label: 'Start chainage', labelAr: 'جراد البداية', value: fmtCh(a) },
          { label: 'Length added', labelAr: 'الطول المضاف', value: `${fmt(b, 3)} m` },
        );
        break;
      case 'sub':
        primary = a - b;
        label = 'Result chainage';
        labelAr = 'الجراد الناتج';
        rows.push(
          { label: 'From chainage', labelAr: 'من الجراد', value: fmtCh(a) },
          { label: 'Length', labelAr: 'الطول', value: `${fmt(b, 3)} m` },
        );
        break;
      case 'interval': {
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        const len = hi - lo;
        primary = len;
        label = 'Interval length';
        labelAr = 'طول الفاصل';
        rows.push(
          { label: 'From', labelAr: 'من', value: fmtCh(lo) },
          { label: 'To', labelAr: 'إلى', value: fmtCh(hi) },
          { label: 'Survey stations @ 20 m', labelAr: 'تدريجات مساحية @ ٢٠ م', value: `${Math.floor(len / 20) + 1}` },
        );
        break;
      }
      case 'mid':
        primary = a + b / 2;
        label = 'Midpoint chainage';
        labelAr = 'جراد المنتصف';
        rows.push({ label: 'Endpoints', labelAr: 'النقطتان', value: `${fmtCh(a)} to ${fmtCh(b)}` });
        break;
      default: {
        // Chainage to stationing: 1+000 = Station 0+100 in some standards.
        primary = a / 20;
        label = 'Station number (20 m stations)';
        labelAr = 'رقم التدريج (تدريج ٢٠ م)';
        rows.push(
          { label: 'Chainage', labelAr: 'الجراد', value: fmtCh(a) },
          { label: 'At 100 m stations', labelAr: 'بتدريج ١٠٠ م', value: (a / 100).toFixed(2) },
        );
      }
    }

    rows.push({ label: 'In metres', labelAr: 'بالمتر', value: `${fmt(primary, 3)} m` });
    rows.push({ label: 'In feet', labelAr: 'بالقدم', value: `${fmt(primary * 3.28084, 2)} ft` });

    return {
      primary: mode === 'stn' ? fmt(primary, 2) : fmtCh(primary),
      primaryUnit: mode === 'stn' ? 'stn' : '',
      primaryLabel: label,
      primaryLabelAr: labelAr,
      rows,
      note: 'Chainage is written as station+metres, e.g. 4+250 = 4,250 m from the origin.',
    };
  },
};

const weightCalc: Calculator = {
  id: 'weight',
  name: 'Weight',
  nameAr: 'الوزن',
  desc: 'Steel bar, plate, pipe and volume-weight take-off.',
  descAr: 'حساب أوزان الحديد والقواعد والأنابيب والأحجام.',
  icon: 'weight',
  group: 'materials',
  fields: [
    { key: 'shape', label: 'Section', labelAr: 'المقطع', type: 'select', default: 'bar',
      options: [
        { value: 'bar', label: 'Round bar (Ø)', labelAr: 'حديد مستدير (ق)' },
        { value: 'square', label: 'Square bar', labelAr: 'حديد مربع' },
        { value: 'plate', label: 'Steel plate', labelAr: 'لوح صلب' },
        { value: 'pipe', label: 'Hollow pipe (Ø × t)', labelAr: 'أنبوب مجوف' },
        { value: 'angle', label: 'Equal angle (L × L × t)', labelAr: 'زاوية متساوية' },
        { value: 'volume', label: 'Material by volume × density', labelAr: 'حجم × كثافة' },
      ] },
    { key: 'd1', label: 'Dimension 1 (Ø / L)', labelAr: 'البعد ١ (ق / ط)', unit: 'mm', type: 'number', min: 0, step: 1, default: 16 },
    { key: 'd2', label: 'Dimension 2 (t / width)', labelAr: 'البعد ٢ (س / عرض)', unit: 'mm', type: 'number', min: 0, step: 1, default: 250 },
    { key: 'len', label: 'Length', labelAr: 'الطول', unit: 'm', type: 'number', min: 0, step: 0.01, default: 12 },
    { key: 'count', label: 'Number of pieces', labelAr: 'عدد القطع', type: 'number', min: 1, step: 1, default: 100 },
    { key: 'vol', label: 'Volume', labelAr: 'الحجم', unit: 'm³', type: 'number', min: 0, step: 0.01, default: 1 },
    { key: 'dens', label: 'Density', labelAr: 'الكثافة', unit: 'kg/m³', type: 'number', min: 1, step: 10, default: 7850 },
  ],
  compute(v) {
    const shape = s(v, 'shape');
    const d1 = n(v, 'd1') / 1000;
    const d2 = n(v, 'd2') / 1000;
    const len = n(v, 'len');
    const count = n(v, 'count');
    const dens = n(v, 'dens');
    const steel = 7850;

    let perPiece = 0;
    let formula = '';
    switch (shape) {
      case 'bar':
        perPiece = (Math.PI * d1 * d1 / 4) * len * steel;
        formula = 'W = (π/4)·D²·L·ρ';
        break;
      case 'square':
        perPiece = d1 * d1 * len * steel;
        formula = 'W = a²·L·ρ';
        break;
      case 'plate':
        perPiece = d1 * d2 * (len / 1000) * steel;
        formula = 'W = b·t·L·ρ';
        break;
      case 'pipe': {
        const ri = Math.max(0, d1 / 2 - d2);
        perPiece = Math.PI * (d1 / 2) ** 2 - Math.PI * ri * ri > 0
          ? (Math.PI * ((d1 / 2) ** 2 - ri * ri) * len * steel)
          : 0;
        formula = 'W = π·(D²−d²)/4·L·ρ';
        break;
      }
      case 'angle':
        perPiece = (2 * d1 * d2 - d2 * d2) * len * steel;
        formula = 'W = (2a−t)·t·L·ρ';
        break;
      default:
        perPiece = n(v, 'vol') * dens;
        formula = 'W = V·ρ';
    }

    const total = perPiece * count;
    return {
      primary: fmt(total, 1),
      primaryUnit: 'kg',
      primaryLabel: 'Total weight',
      primaryLabelAr: 'إجمالي الوزن',
      rows: [
        { label: 'Weight per piece', labelAr: 'الوزن للقطعة', value: `${fmt(perPiece, 3)} kg` },
        { label: 'Number of pieces', labelAr: 'عدد القطع', value: `${fmt(count, 0)}` },
        { label: 'Total weight', labelAr: 'إجمالي الوزن', value: `${fmt(total, 2)} kg`, emphasis: true },
        { label: 'In tonnes', labelAr: 'بالطن', value: `${fmt(total / 1000, 4)} t` },
        { label: 'Formula', labelAr: 'المعادلة', value: formula },
        { label: 'Steel density used', labelAr: 'كثافة الحديد المستخدمة', value: '7850 kg/m³' },
      ],
      note: 'Bar weight is theoretical; apply 2–3% for cutting and bending loss when ordering.',
    };
  },
};

const matEstimate: Calculator = {
  id: 'estimate',
  name: 'Material Estimation',
  nameAr: 'تقدير المواد',
  desc: 'Masonry, plaster, tiling, paint, blockwork and blinding take-off.',
  descAr: 'تقدير المباني واللبخ والبلاط والدهان والبلوكات.',
  icon: 'estimate',
  group: 'materials',
  fields: [
    { key: 'item', label: 'Work item', labelAr: 'بند العمل', type: 'select', default: 'brick',
      options: [
        { value: 'brick', label: 'Clay brick masonry', labelAr: 'مباني طوب أحمر' },
        { value: 'block', label: 'AAC / concrete blockwork', labelAr: 'بلوك AAC / خرساني' },
        { value: 'plaster', label: 'Cement plaster', labelAr: 'لبخ أسمنتي' },
        { value: 'screed', label: 'Floor screed', labelAr: 'أرضية screed' },
        { value: 'tile', label: 'Floor / wall tiling', labelAr: 'بلاط أرضيات وجدران' },
        { value: 'paint', label: 'Emulsion paint', labelAr: 'دهان مائي' },
        { value: 'waterproof', label: 'Waterproofing membrane', labelAr: 'عزل مائي' },
        { value: 'blinding', label: 'Lean concrete blinding', labelAr: 'خرسانة نظافة' },
        { value: 'landfill', label: 'Sand fill / sub-base', labelAr: 'ردم / طبقة أساس' },
      ] },
    { key: 'wallL', label: 'Wall length', labelAr: 'طول الجدار', unit: 'm', type: 'number', min: 0, step: 0.01, default: 20 },
    { key: 'wallH', label: 'Wall height', labelAr: 'ارتفاع الجدار', unit: 'm', type: 'number', min: 0, step: 0.01, default: 3 },
    { key: 'thick', label: 'Thickness', labelAr: 'السماكة', unit: 'mm', type: 'number', min: 0, step: 5, default: 200 },
    { key: 'coat', label: 'Coat thickness', labelAr: 'سماكة الطبقة', unit: 'mm', type: 'number', min: 1, step: 1, default: 15 },
    { key: 'was', label: 'Wastage', labelAr: 'الهدر', unit: '%', type: 'number', min: 0, max: 40, step: 1, default: 5 },
    { key: 'cover', label: 'Coverage per unit (tile / litre / m²)', labelAr: 'التغطية للوحدة', type: 'number', min: 0, step: 0.5, default: 1.15 },
  ],
  compute(v) {
    const item = s(v, 'item');
    const L = n(v, 'wallL');
    const H = n(v, 'wallH');
    const t = n(v, 'thick') / 1000;
    const coat = n(v, 'coat') / 1000;
    const was = 1 + n(v, 'was') / 100;
    const cover = n(v, 'cover');
    const mix = mixFor('148');

    let primary = 0;
    let unit = '';
    let label = 'Quantity';
    let labelAr = 'الكمية';
    const rows: CalcResultRow[] = [];
    const grossArea = L * H;

    switch (item) {
      case 'brick': {
        const netVol = grossArea * t;
        const mortarVol = netVol * 0.33;
        const brickVol = netVol - mortarVol;
        const mortar = mixQuantities(mortarVol, mix);
        const bricks = (brickVol / (0.2 * 0.1 * 0.05)) * was;
        primary = Math.ceil(bricks);
        unit = 'bricks';
        label = 'Bricks required';
        labelAr = 'عدد الطوب';
        rows.push(
          { label: 'Wall area', labelAr: 'مساحة الجدار', value: `${fmt(grossArea)} m²` },
          { label: 'Net masonry volume', labelAr: 'حجم المباني الصافي', value: `${fmt(netVol)} m³` },
          { label: 'Bricks (incl. wastage)', labelAr: 'الطوب مع الهدر', value: `${fmt(primary, 0)} pcs`, emphasis: true },
          { label: 'Mortar volume', labelAr: 'حجم المونة', value: `${fmt(mortarVol)} m³` },
          { label: 'Cement for mortar', labelAr: 'أسمنت المونة', value: `${fmt(mortar.cementBags, 1)} bags` },
          { label: 'Sand for mortar', labelAr: 'رمل المونة', value: `${fmt(mortar.sandM3)} m³` },
        );
        break;
      }
      case 'block': {
        const netVol = grossArea * t;
        const mortarVol = netVol * 0.12;
        const blockVol = netVol - mortarVol;
        const blocks = (blockVol / (0.6 * 0.2 * 0.2)) * was;
        const adhesive = mixQuantities(mortarVol, mixFor('125'));
        primary = Math.ceil(blocks);
        unit = 'blocks';
        label = 'Blocks required';
        labelAr = 'عدد البلوكات';
        rows.push(
          { label: 'Wall area', labelAr: 'مساحة الجدار', value: `${fmt(grossArea)} m²` },
          { label: 'Blocks (200×200×600)', labelAr: 'بلوكات (٢٠٠×٢٠٠×٦٠٠)', value: `${fmt(primary, 0)} pcs`, emphasis: true },
          { label: 'Thin-bed adhesive', labelAr: 'لاصق رقيق', value: `${fmt(adhesive.cementBags, 1)} bags + ${fmt(adhesive.sandM3)} m³ sand` },
        );
        break;
      }
      case 'plaster': {
        const vol = grossArea * coat * was;
        const q = mixQuantities(vol, mix);
        primary = q.cementBags;
        unit = 'bags';
        label = 'Cement required';
        labelAr = 'الأسمنت المطلوب';
        rows.push(
          { label: 'Plaster area', labelAr: 'مساحة اللبخ', value: `${fmt(grossArea)} m²` },
          { label: 'Wet mortar volume', labelAr: 'حجم المونة الرطبة', value: `${fmt(vol)} m³` },
          { label: 'Cement', labelAr: 'الأسمنت', value: `${fmt(q.cementBags, 1)} bags (${fmt(q.cementTon, 3)} t)`, emphasis: true },
          { label: 'Sand', labelAr: 'الرمل', value: `${fmt(q.sandM3)} m³ (${fmt(q.sandTon, 2)} t)` },
          { label: 'Coverage per bag', labelAr: 'التغطية لكل كيس', value: `${fmt(grossArea / Math.max(q.cementBags, 0.0001), 3)} m²/bag` },
        );
        break;
      }
      case 'screed': {
        const vol = grossArea * coat * was;
        const q = mixQuantities(vol, mix);
        primary = vol;
        unit = 'm³';
        label = 'Screed volume';
        labelAr = 'حجم الأرضية';
        rows.push(
          { label: 'Screed area', labelAr: 'مساحة الأرضية', value: `${fmt(grossArea)} m²` },
          { label: 'Volume', labelAr: 'الحجم', value: `${fmt(vol)} m³`, emphasis: true },
          { label: 'Cement', labelAr: 'الأسمنت', value: `${fmt(q.cementBags, 1)} bags` },
          { label: 'Sand', labelAr: 'الرمل', value: `${fmt(q.sandM3)} m³` },
          { label: 'Aggregate', labelAr: 'الركام', value: `${fmt(q.aggM3)} m³` },
        );
        break;
      }
      case 'tile': {
        const tiles = grossArea * was * cover;
        primary = tiles;
        unit = 'm²';
        label = 'Tile area required';
        labelAr = 'مساحة البلاط المطلوبة';
        const adhesive = mixQuantities(grossArea * 0.005 * was, mixFor('125'));
        rows.push(
          { label: 'Tiled area', labelAr: 'مساحة التبليط', value: `${fmt(grossArea)} m²` },
          { label: 'Tiles incl. wastage & cutting', labelAr: 'البلاط مع الهدر والقص', value: `${fmt(tiles)} m²`, emphasis: true },
          { label: 'Number of 600×600 tiles', labelAr: 'عدد بلاطات ٦٠٠×٦٠٠', value: `${Math.ceil(tiles / 0.36)} pcs` },
          { label: 'Tile adhesive', labelAr: 'لاصق البلاط', value: `${fmt(adhesive.cementBags, 1)} bags + ${fmt(adhesive.sandM3)} m³ sand` },
          { label: 'Grout', labelAr: 'سده الفواصل', value: `${fmt(tiles * 0.05, 2)} m³` },
        );
        break;
      }
      case 'paint': {
        const litres = grossArea * was * cover;
        primary = litres;
        unit = 'L';
        label = 'Paint required';
        labelAr = 'الطلاء المطلوب';
        rows.push(
          { label: 'Paint area', labelAr: 'مساحة الدهان', value: `${fmt(grossArea)} m²` },
          { label: 'Paint (2 coats at coverage)', labelAr: 'الطلاء (طبقتان)', value: `${fmt(litres)} L`, emphasis: true },
          { label: 'Number of 5 L tins', labelAr: 'عدد علب ٥ لتر', value: `${Math.ceil(litres / 5)}` },
          { label: 'Primer', labelAr: 'البرايمر', value: `${fmt(grossArea * 0.12 * was)} L` },
        );
        break;
      }
      case 'waterproof': {
        const area = grossArea * was * cover;
        primary = area;
        unit = 'm²';
        label = 'Membrane area';
        labelAr = 'مساحة العزل';
        rows.push(
          { label: 'Surface to waterproof', labelAr: 'السطح المراد عزله', value: `${fmt(grossArea)} m²` },
          { label: 'Membrane incl. laps & upstands', labelAr: 'الطبقة مع الفوقيات والصعود', value: `${fmt(area)} m²`, emphasis: true },
          { label: 'Primer / substrate prep', labelAr: 'تحضير الأساس', value: `${fmt(grossArea * 0.15 * was)} L` },
        );
        break;
      }
      case 'blinding': {
        const vol = grossArea * coat * was;
        const q = mixQuantities(vol, mixFor('115'));
        primary = vol;
        unit = 'm³';
        label = 'Blinding volume';
        labelAr = 'حجم خرسانة النظافة';
        rows.push(
          { label: 'Area', labelAr: 'المساحة', value: `${fmt(grossArea)} m²` },
          { label: 'Volume', labelAr: 'الحجم', value: `${fmt(vol)} m³`, emphasis: true },
          { label: 'Cement (1:1:5 lean)', labelAr: 'الأسمنت (١:١:٥ خفيف)', value: `${fmt(q.cementBags, 1)} bags` },
          { label: 'Sand', labelAr: 'الرمل', value: `${fmt(q.sandM3)} m³` },
          { label: 'Aggregate', labelAr: 'الركام', value: `${fmt(q.aggM3)} m³` },
        );
        break;
      }
      default: {
        const vol = grossArea * coat * was;
        primary = vol;
        unit = 'm³';
        label = 'Compacted fill volume';
        labelAr = 'حجم الردم المدموك';
        rows.push(
          { label: 'Plan area', labelAr: 'المساحة', value: `${fmt(grossArea)} m²` },
          { label: 'Compacted volume', labelAr: 'الحجم المدموك', value: `${fmt(vol)} m³`, emphasis: true },
          { label: 'Loose volume (1.25 swell)', labelAr: 'الحجم المفكوك', value: `${fmt(vol * 1.25)} m³` },
          { label: 'Haulage loads (12 m³ loose)', labelAr: 'عدد النقلات', value: `${Math.ceil((vol * 1.25) / 12)}` },
          { label: 'Compaction passes (95% MDD)', labelAr: 'عدد مرات الدمك', value: '6' },
        );
      }
    }

    return {
      primary: fmt(primary, primary > 100 ? 0 : 2),
      primaryUnit: unit,
      primaryLabel: label,
      primaryLabelAr: labelAr,
      rows,
      note: 'Quantities include the stated wastage allowance. Mix proportions are nominal 1:1:4.5 unless noted.',
    };
  },
};

export const CALCULATORS: Calculator[] = [
  area,
  volume,
  concrete,
  excavation,
  percentage,
  unitconv,
  lengthCalc,
  weightCalc,
  matEstimate,
];

export const CALC_GROUPS: { id: CalcGroup; label: string; labelAr: string }[] = [
  { id: 'geometry', label: 'Geometry', labelAr: 'هندسة' },
  { id: 'concrete', label: 'Concrete', labelAr: 'خرسانة' },
  { id: 'earthworks', label: 'Earthworks', labelAr: 'أعمال ترابية' },
  { id: 'utilities', label: 'Site Utilities', labelAr: 'أدوات الموقع' },
  { id: 'materials', label: 'Materials & Weight', labelAr: 'مواد وأوزان' },
  { id: 'unitconv', label: 'Unit Conversion', labelAr: 'تحويل الوحدات' },
];

export function getCalculator(id: string): Calculator | undefined {
  return CALCULATORS.find((c) => c.id === id);
}

export function defaultValues(calc: Calculator): CalcValues {
  const out: CalcValues = {};
  for (const f of calc.fields) out[f.key] = f.default;
  return out;
}
