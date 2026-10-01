/* ==========================================================================
   DOMAIN TYPES
   SiteAxis
   ========================================================================== */

export type Lang = 'en' | 'ar';
export type ThemeMode = 'light' | 'dark' | 'system';
export type Accent = 'petrol' | 'steel' | 'ochre' | 'graphite';
export type Density = 'comfortable' | 'compact';
export type CurrencyCode = 'SAR' | 'AED' | 'QAR' | 'KWD' | 'BHD' | 'OMR' | 'USD' | 'EUR';

export const PROJECT_STATUSES = ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const TASK_STATUSES = ['Pending', 'In Progress', 'Completed'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PAYMENT_STATUSES = ['Paid', 'Partially Paid', 'Pending', 'Overdue'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const WEATHER = [
  'Clear / Sunny',
  'Hot & Sunny',
  'Partly Cloudy',
  'Hazy',
  'Dust Storm',
  'Dry Wind',
  'Light Rain',
  'Thunderstorm',
  'Extreme Heat',
] as const;
export type Weather = (typeof WEATHER)[number];

export const MATERIAL_CATEGORIES = [
  'Cement & Binders',
  'Aggregates',
  'Reinforcement Steel',
  'Ready-Mix Concrete',
  'Formwork & Shuttering',
  'Masonry & Blocks',
  'Structural Steel',
  'Pipes & Fittings',
  'Waterproofing & Insulation',
  'Finishes & Coatings',
  'Electrical & Instrumentation',
  'Safety & Consumables',
] as const;
export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

export const UNITS = [
  'm³',
  'm²',
  'm',
  'cm',
  'mm',
  'kg',
  'ton',
  'litre',
  'pcs',
  'bag',
  'roll',
  'sheet',
  'bundle',
  'box',
  'hour',
  'day',
] as const;
export type Unit = (typeof UNITS)[number];

export const EXPENSE_CATEGORIES = [
  'Materials',
  'Labour & Wages',
  'Equipment & Plant',
  'Subcontractors',
  'Petrol & Fuel',
  'Transport & Logistics',
  'Site Office & Camp',
  'Utilities',
  'Professional Fees',
  'Hire Charges',
  'Insurance & Permits',
  'Other',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const DOC_CATEGORIES = [
  'Drawings',
  'Project Documents',
  'Contracts',
  'Invoices',
  'Reports',
  'Site Photographs',
  'Certificates & Permits',
  'Technical Specifications',
  'Other',
] as const;
export type DocCategory = (typeof DOC_CATEGORIES)[number];

export const PROJECT_TYPES = [
  'Civil & Structural',
  'Infrastructure & Roads',
  'Water & Sewerage',
  'Building Construction',
  'Industrial & Warehousing',
  'Marine & Coastal',
  'HVAC & Mechanical',
  'Electrical & Instrumentation',
  'Facilities Management',
  'Geotechnical & Surveying',
] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

/* ------------------------------------------------------------------ */

export interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  location: string;
  type: ProjectType;
  startDate: string; // ISO yyyy-mm-dd
  endDate: string;
  manager: string;
  budget: number;
  status: ProjectStatus;
  progress: number; // 0..100
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  description: string;
  assignee: string;
  priority: Priority;
  startDate: string;
  dueDate: string;
  status: TaskStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface PhotoMeta {
  id: string;
  name: string;
  file: string; // stored filename
  mime: string;
  size: number;
  caption: string;
}

export interface SiteReport {
  id: string;
  refNo: string;
  projectId: string;
  date: string;
  siteLocation: string;
  weather: Weather;
  tempHigh: number;
  tempLow: number;
  workers: number;
  engineers: string[];
  workCompleted: string;
  workInProgress: string;
  materialsUsed: string;
  equipmentUsed: string;
  issues: string;
  safetyObservations: string;
  tomorrowPlan: string;
  notes: string;
  photos: PhotoMeta[];
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  id: string;
  name: string;
  category: MaterialCategory;
  quantity: number;
  unit: Unit;
  unitPrice: number;
  supplier: string;
  projectId: string;
  receivedDate: string;
  minStock: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  projectId: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  vendor: string;
  paymentStatus: PaymentStatus;
  refNo: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocRecord {
  id: string;
  projectId: string;
  name: string;
  category: DocCategory;
  fileName: string;
  storedName: string;
  mime: string;
  size: number;
  uploadedAt: string;
  description: string;
  rev: string;
}

export interface UserProfile {
  name: string;
  username: string;
  email: string;
  role: string;
  designation: string;
  company: string;
  phone: string;
  location: string;
  country: string;
  employeeId: string;
  bio: string;
  photo: string | null; // data URL or /uploads path
  qualifications: { id: string; text: string }[];
  languages: { id: string; text: string }[];
  memberships: { id: string; text: string }[];
}

export interface NotificationPrefs {
  taskDue: boolean;
  taskOverdue: boolean;
  projectMilestone: boolean;
  lowStock: boolean;
  budgetAlert: boolean;
  dailyReport: boolean;
  emailDigest: boolean;
  digestFrequency: 'daily' | 'weekly' | 'off';
  soundAlert: boolean;
}

export interface SecurityPrefs {
  autoLockMinutes: number; // 0 = never
  failedLockout: number; // attempts before lockout
}

export interface Settings {
  lang: Lang;
  theme: ThemeMode;
  accent: Accent;
  density: Density;
  currency: CurrencyCode;
  currencyRate: number; // units of `currency` per 1 SAR
  dateFormat: 'gregorian' | 'hijri';
  notifications: NotificationPrefs;
  security: SecurityPrefs;
  pdfFooter: string;
}

export interface Account {
  username: string;
  email: string;
  displayName: string;
  passwordHash: string; // scrypt
  passwordSalt: string;
  securityQuestion: string;
  securityAnswerHash: string;
  securityAnswerSalt: string;
  failedAttempts: number;
  lockedUntil: number;
  /** Single-use password-recovery token, issued after security-answer check. */
  recoveryToken: string;
  recoveryExpiry: number;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  at: string; // ISO datetime
  kind: 'project' | 'task' | 'site-report' | 'material' | 'expense' | 'document' | 'settings' | 'auth';
  action: 'create' | 'update' | 'delete' | 'login' | 'logout';
  entityId: string;
  summary: string; // English base text; i18n keys in summaries are prefixed
  projectId: string | null;
  actor: string;
}

export interface DBShape {
  version: number;
  seededAt: string;
  account: Account;
  profile: UserProfile;
  settings: Settings;
  projects: Project[];
  tasks: Task[];
  siteReports: SiteReport[];
  materials: Material[];
  expenses: Expense[];
  documents: DocRecord[];
  activity: ActivityEntry[];
}

/** Public shape sent to the browser — never includes credential material. */
export interface Snapshot {
  version: number;
  seededAt: string;
  profile: UserProfile;
  settings: Settings;
  account: Pick<Account, 'username' | 'email' | 'displayName' | 'lastLoginAt' | 'createdAt'>;
  projects: Project[];
  tasks: Task[];
  siteReports: SiteReport[];
  materials: Material[];
  expenses: Expense[];
  documents: DocRecord[];
  activity: ActivityEntry[];
}

export const COLLECTIONS = [
  'projects',
  'tasks',
  'siteReports',
  'materials',
  'expenses',
  'documents',
] as const;
export type Collection = (typeof COLLECTIONS)[number];
