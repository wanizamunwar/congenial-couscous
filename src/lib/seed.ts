/* ==========================================================================
   SEED DATABASE  —  realistic operating data for Sami Al-Anazi, KSA
   All figures are plausible Saudi-market values (SAR). Dates are generated
   relative to "today" so the data set always looks current.
   ========================================================================== */

import type {
  Account,
  ActivityEntry,
  DBShape,
  Expense,
  Material,
  Project,
  SiteReport,
  DocRecord,
  Task,
  UserProfile,
  Settings,
} from './types';
import { hashPassword } from './server/auth';

/* ------------------------------- date utils ----------------------------- */

const DAY = 86400000;
const now = new Date();
const base = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0);

/** ISO date string, `offset` days from today (negative = past). */
function d(offset: number): string {
  return new Date(base + offset * DAY).toISOString().slice(0, 10);
}
/** Full ISO datetime, `offset` days from today with an hour offset. */
function dt(offset: number, hour = 9, minute = 20): string {
  const x = new Date(base + offset * DAY);
  x.setUTCHours(hour, minute, 0, 0);
  return x.toISOString();
}
function id(prefix: string, n: number | string): string {
  return `${prefix}_${String(n).padStart(4, '0')}${typeof n === 'number' && n < 100 ? '' : ''}`;
}

/* ------------------------------ team roster ----------------------------- */

export const ENGINEERS = [
  'Engr. Sami Al-Anazi',
  'Engr. Faisal Al-Dosari',
  'Engr. Mohammed Imran',
  'Engr. Rashid Al-Harbi',
  'Engr. Suresh Kumar',
  'Engr. Ahmed Hassan',
  'Engr. Tariq Al-Mutairi',
  'Engr. Naveed Anjum',
  'Engr. Hisham Sayed',
  'Engr. Omar Farouk',
  'Mr. Joseph Mathew',
  'Mr. Khalid Al-Otaibi',
] as const;

/* -------------------------------- projects ------------------------------ */

const projects: Project[] = [
  {
    id: 'prj_0001',
    code: 'SAX-RUH-MTR-0412',
    name: 'Riyadh Metro Line 3 Extension — Civil Works Package 7',
    client: 'ArRiyadh New Mobility (Riyadh Metro)',
    location: 'Al Malqa, Riyadh',
    type: 'Civil & Structural',
    startDate: d(-548),
    endDate: d(302),
    manager: 'Engr. Faisal Al-Dosari',
    budget: 48_500_000,
    status: 'Active',
    progress: 62,
    notes:
      'Viaduct segments P12–P18 and station box SB-3. Client requires 100% ITP hold-point sign-off before each pour. Night working permitted 22:00–05:00 for the Al Malqa traffic diversion zone. Dust-storm stoppage protocol in force (wind > 45 km/h).',
    createdAt: dt(-549, 8, 5),
    updatedAt: dt(-1, 15, 40),
  },
  {
    id: 'prj_0002',
    code: 'SAX-RUH-RDW-0233',
    name: 'King Fahd Road 45 Widening & Grade Separation',
    client: 'Riyadh Municipality',
    location: 'Al Aqiq, Riyadh',
    type: 'Infrastructure & Roads',
    startDate: d(-424),
    endDate: d(126),
    manager: 'Engr. Rashid Al-Harbi',
    budget: 32_750_000,
    status: 'Active',
    progress: 78,
    notes:
      'Utility diversion package (MV/HV) by Saudi Electricity Company is 40% complete and now the critical path. ATMS duct-bank installation in progress. Traffic management plan TMP-RDW-07 active; three-lane phasing.',
    createdAt: dt(-425, 7, 40),
    updatedAt: dt(0, 8, 12),
  },
  {
    id: 'prj_0003',
    code: 'SAX-JED-WRP-0188',
    name: 'Jeddah North Sewage Treatment Plant — Phase 2',
    client: 'National Water Services Company (NWSC)',
    location: 'Al Amarah, Jeddah',
    type: 'Water & Sewerage',
    startDate: d(-672),
    endDate: d(-28),
    manager: 'Engr. Suresh Kumar',
    budget: 27_400_000,
    status: 'Completed',
    progress: 100,
    notes:
      'Practical completion achieved. Snag list closed 100%; O&M training delivered to NWSC staff over 5 days. As-built IFC set issued Rev-C. Retention release claim submitted.',
    createdAt: dt(-673, 8, 0),
    updatedAt: dt(-28, 11, 30),
  },
  {
    id: 'prj_0004',
    code: 'SAX-DAM-IND-0551',
    name: 'Dammam Industrial Logistics Park — Warehouse Block C',
    client: 'Dammam Logistics Company (DLC)',
    location: 'Dammam Second Industrial City',
    type: 'Industrial & Warehousing',
    startDate: d(-271),
    endDate: d(244),
    manager: 'Engr. Ahmed Hassan',
    budget: 19_800_000,
    status: 'Active',
    progress: 41,
    notes:
      'Pre-engineered steel frame erection began. 14 of 22 crane-lift operations complete. Roof sheeting follows frame line 6. Bay height 12 m, EOT for 2 trailers per bay.',
    createdAt: dt(-272, 9, 10),
    updatedAt: dt(-1, 17, 5),
  },
  {
    id: 'prj_0005',
    code: 'SAX-JUB-PWR-0092',
    name: 'Jubail 220/34.5 kV GIS Substation',
    client: 'Saudi Electricity Company (SEC)',
    location: 'Jubail Industrial City 3',
    type: 'Electrical & Instrumentation',
    startDate: d(-184),
    endDate: d(62),
    manager: 'Engr. Hisham Sayed',
    budget: 14_250_000,
    status: 'On Hold',
    progress: 34,
    notes:
      'Client instruction received: hold all works pending revised SEC protection-coordination study and the 34.5 kV cable-route approval. Site secured; 24-hr security in place. Steel supports and cable trench complete.',
    createdAt: dt(-185, 7, 55),
    updatedAt: dt(-9, 10, 15),
  },
  {
    id: 'prj_0006',
    code: 'SAX-TUK-HSP-0734',
    name: 'Tabuk Regional Hospital Expansion — Outpatient Block',
    client: 'Ministry of Health (MoH)',
    location: 'Tabuk',
    type: 'Building Construction',
    startDate: d(-92),
    endDate: d(488),
    manager: 'Engr. Sami Al-Anazi',
    budget: 61_300_000,
    status: 'Planning',
    progress: 6,
    notes:
      'Design 90% complete (Rev D IFC pending). Site establishment done, hoarding up. Enabling works scheduled after MoH tender clearance. Healthcare fit-out standards to be applied per GFHP requirements.',
    createdAt: dt(-93, 8, 30),
    updatedAt: dt(-2, 9, 45),
  },
  {
    id: 'prj_0007',
    code: 'SAX-KHB-CST-0076',
    name: 'Al Khobar Corniche Coastal Protection Works',
    client: 'Eastern Province Municipality',
    location: 'Al Khobar Corniche, Khobar',
    type: 'Marine & Coastal',
    startDate: d(-336),
    endDate: d(91),
    manager: 'Engr. Omar Farouk',
    budget: 22_900_000,
    status: 'Active',
    progress: 68,
    notes:
      'Rock revetment placement 640 m of 940 m complete. Interlocking concrete armour units placed by crane barge. Tidal window restricts marine works to two shifts per day.',
    createdAt: dt(-337, 6, 45),
    updatedAt: dt(-1, 14, 20),
  },
  {
    id: 'prj_0008',
    code: 'SAX-RUH-TWR-0311',
    name: 'Riyadh Mixed-Use Tower T3 — Substructure & Podium',
    client: 'Al Mutable Investment Co.',
    location: 'Hittin, Riyadh',
    type: 'Building Construction',
    startDate: d(-121),
    endDate: d(612),
    manager: 'Engr. Mohammed Imran',
    budget: 38_600_000,
    status: 'Active',
    progress: 22,
    notes:
      '2-level basement raft on 900 mm BESD piles. Diaphragm wall complete. Waterproofing warranty test (48-hr flood) passed. C40/50 concrete for podium transfer slab.',
    createdAt: dt(-122, 7, 20),
    updatedAt: dt(0, 7, 55),
  },
  {
    id: 'prj_0009',
    code: 'SAX-MED-ROA-0288',
    name: 'Madinah Ring Road — Section 4 Earthworks',
    client: 'Ministry of Transport',
    location: 'Madinah',
    type: 'Infrastructure & Roads',
    startDate: d(-360),
    endDate: d(-40),
    manager: 'Engr. Naveed Anjum',
    budget: 9_600_000,
    status: 'Cancelled',
    progress: 18,
    notes:
      'Contract terminated by the client on 12th of last month following re-tender of the section as a single lot. Demobilisation complete; site establishment handed back. All records archived.',
    createdAt: dt(-361, 8, 15),
    updatedAt: dt(-40, 12, 0),
  },
];

/* --------------------------------- tasks -------------------------------- */

type TaskSeed = [
  number,
  string /* projectId */,
  string /* name */,
  string /* assignee */,
  Task['priority'],
  Task['status'],
  number /* startOffset */,
  number /* dueOffset */,
  string /* description */,
];

const taskSeeds: TaskSeed[] = [
  // prj_0001 metro
  [1, 'prj_0001', 'Cast viaduct segment P14 — post-tensioning', 'Engr. Suresh Kumar', 'Urgent', 'In Progress', -12, 4, 'Symmetric stressing per PT drawing 4/P14. Concrete C50/60, w/c 0.34. Hold point H-6: cube test at 7 and 28 days before grout.'],
  [2, 'prj_0001', 'Station box SB-3 — 2nd-stage slab reinforcement', 'Engr. Sami Al-Anazi', 'High', 'In Progress', -8, 9, 'Lap length 40d at alternate bars. Approved shop drawing SD-2211 Rev B. Couplers to be torque-checked per test report TR-118.'],
  [3, 'prj_0001', 'Traffic diversion — Al Malqa phase 3 installation', 'Engr. Faisal Al-Dosari', 'High', 'Pending', -1, 16, 'Set out per TMP-MTR-07. Crash-rated barriers, advance warning signage 300 m, arrow boards. Notify police liaison 48 h ahead.'],
  [4, 'prj_0001', 'QA/3 — Non-conformance report closure audit', 'Engr. Tariq Al-Mutairi', 'Medium', 'In Progress', -20, 7, 'Close 6 open NCRs raised during the Q2 pour cycle. Photographic evidence required for each closure.'],
  [5, 'prj_0001', 'Drainage — 600 mm RCP laying, chainage 4+200', 'Mr. Khalid Al-Otaibi', 'Medium', 'Pending', 2, 26, 'Bedding 150 mm compacted granular. Check invert levels every 25 m with laser level.'],
  [6, 'prj_0001', 'Weekly progress valuation & IPC-07 preparation', 'Engr. Sami Al-Anazi', 'High', 'Pending', 3, 12, 'Quantities to be reconciled with site measurement sheets. Submit to client rep by Tuesday 16:00.'],
  [7, 'prj_0001', 'Weld inspection — launch gantry structural steel', 'Engr. Hisham Sayed', 'Medium', 'Completed', -34, -6, '100% MPI on lifting lugs, 10% PT on full-pen welds. Report WQR-098 issued, all accepted.'],
  [8, 'prj_0001', 'As-built survey — viaduct P12 and P13', 'Engr. Naveed Anjum', 'Low', 'Completed', -44, -19, 'Total station, control on BM-11. RMS within 8 mm. Issued IFC as-built sheets A-201, A-202.'],

  // prj_0002 road 45
  [9, 'prj_0002', 'MV cable duct-bank — trench excavation ch. 6+500', 'Engr. Rashid Al-Harbi', 'Urgent', 'In Progress', -6, 3, 'Trench 1.2 m W × 1.4 m D, shored. Spoil segregation — Saudi Aramco land is adjacent, no encroachment permitted.'],
  [10, 'prj_0002', 'ATMS gantry foundations — 8 no. cast', 'Engr. Omar Farouk', 'High', 'In Progress', -15, 2, 'Cast against surge test load. Foundation certification by SEC before backfill.'],
  [11, 'prj_0002', 'Grade separation — pier P4 pile cap formwork', 'Engr. Suresh Kumar', 'High', 'Pending', 4, 22, '3.6 m cap depth. Use flow-form or self-climbing shuttering; do not use timber props above 2.7 m.'],
  [12, 'prj_0002', 'Safety induction — new crew (14 operatives)', 'Mr. Joseph Mathew', 'Medium', 'Pending', 1, 6, 'Toolbox talk on live carriageway works, 45-min induction card. Add names to site register.'],
  [13, 'prj_0002', 'Sub-base compaction testing — 800 m³', 'Engr. Tariq Al-Mutairi', 'Medium', 'Completed', -22, -8, 'Proctor MDD 2.02 g/cm³. 98% MDD over top 300 mm. Nuclear gauge 1218.'],
  [14, 'prj_0002', 'Utility survey as-built — SEC and SWCC', 'Engr. Naveed Anjum', 'Low', 'Completed', -40, -11, 'Registered survey document issued to SEC under submission ref. SEC/RO/45/882.'],

  // prj_0003 WRP (completed)
  [15, 'prj_0003', 'Practical completion inspection with NWSC', 'Engr. Suresh Kumar', 'High', 'Completed', -46, -34, 'Joint walkdown of 312 items. 4 minor snags raised, all closed within 5 days.'],
  [16, 'prj_0003', 'O&M training delivery — 5 days', 'Engr. Ahmed Hassan', 'Medium', 'Completed', -40, -34, 'Delivered to 11 NWSC operators. Attendance certificates issued.'],
  [17, 'prj_0003', 'As-built IFC dossier submission', 'Engr. Sami Al-Anazi', 'High', 'Completed', -33, -28, 'Rev-C, 214 sheets incl. process and instrumentation. Hard copy + encrypted digital set.'],

  // prj_0004 warehouse
  [18, 'prj_0004', 'Crane lift — frames F13 to F16', 'Engr. Ahmed Hassan', 'High', 'In Progress', -3, 8, 'Mobile crane 250 t. Lift plan LP-DLC-07. Wind limit 9 m/s — check anemometer hourly, log in DSR.'],
  [19, 'prj_0004', 'Anchor bolt survey & grouting, grid line 4', 'Engr. Naveed Anjum', 'High', 'In Progress', -10, 5, 'As-built deviations to be within ±6 mm. Non-conforming bolts to be reported, not adjusted on site.'],
  [20, 'prj_0004', 'Floor slab — first pour 1,450 m²', 'Engr. Mohammed Imran', 'Medium', 'Pending', 6, 24, 'C35/45, 200 mm, steel mesh A393. Bay joint saw-cut 24 h after pour.'],
  [21, 'prj_0004', 'Fire sprinkler main — 250 mm, riser 1', 'Engr. Hisham Sayed', 'Medium', 'Pending', 14, 46, 'Schedule 40 pipe. Hydrostatic test 10 bar for 2 h before insulation.'],
  [22, 'prj_0004', 'Perimeter fence & gatehouse', 'Engr. Rashid Al-Harbi', 'Low', 'Pending', 10, 60, '2.4 m mesh + 3-strand top. Barbed wire arms inward per security directive.'],

  // prj_0005 substation
  [23, 'prj_0005', 'Secured stoppage audit & site preservation', 'Engr. Hisham Sayed', 'High', 'Completed', -9, -4, 'Cables de-energised and sealed, equipment bagged, temporary covers fitted. Photo register completed.'],
  [24, 'prj_0005', 'Cable trench — 34.5 kV duct installation', 'Engr. Suresh Kumar', 'High', 'On Hold Placeholder', -30, 40, ''],
  [25, 'prj_0005', 'Procure long-lead — 220 kV switchgear', 'Engr. Omar Farouk', 'Medium', 'On Hold Placeholder', -20, 45, ''],

  // prj_0006 hospital
  [26, 'prj_0006', 'Design review — Rev D IFC issue', 'Engr. Sami Al-Anazi', 'High', 'In Progress', -18, 6, 'Coordination clash review with structural and MEP. Hospital design requires 1.8 m clear corridor minimum; verify against GFHP.'],
  [27, 'prj_0006', 'Enabling works — site clearance & bulk cut', 'Engr. Ahmed Hassan', 'Medium', 'Pending', 5, 34, 'Bulk earthworks to platform level. Geotechnical report revises founding level by -0.6 m at the NE corner.'],
  [28, 'prj_0006', 'Temporary compound — offices & welfare', 'Engr. Rashid Al-Harbi', 'Low', 'In Progress', -30, -8, '6 cabins, potable water testing, fire extinguishers per NFPA 10. Welfare inspection passed.'],

  // prj_0007 coastal
  [29, 'prj_0007', 'Rock revetment placement — chainage 2+400 to 2+900', 'Engr. Omar Farouk', 'Urgent', 'In Progress', -14, 12, '2–5 t quarry run rock, two-layer placement, geotextile separator. Tidal windows 06:00–09:00 and 16:00–19:00.'],
  [30, 'prj_0007', 'Armour unit placement — bay 4', 'Engr. Suresh Kumar', 'High', 'In Progress', -21, 18, 'Accropode units 8 t. Crane barge 600 t. Positional tolerance ±150 mm; survey each 20 units.'],
  [31, 'prj_0007', 'Marine environmental monitoring — turbidity', 'Engr. Ahmed Hassan', 'Medium', 'Pending', 2, 8, 'Turbidity limit 25 NTU at outfall. Stop placing if exceeded — notify client and EPM within 2 h.'],
  [32, 'prj_0007', 'Coping beam formwork, promenade section', 'Engr. Sami Al-Anazi', 'Medium', 'Pending', 8, 30, 'Cast in 3 m panels. Apply chloride-resistant sealer to the tide zone.'],
  [33, 'prj_0007', 'Dredging survey — bathymetry validation', 'Engr. Naveed Anjum', 'Low', 'Completed', -18, -5, 'Multibeam survey. Volumes reconciled with barge logs; 214 m³ shortfall noted to be recovered.'],

  // prj_0008 tower
  [34, 'prj_0008', 'Pile load testing — 3 no. FEA and 2 no. vertical', 'Engr. Mohammed Imran', 'High', 'In Progress', -4, 11, 'FEA to 1.5× working load. Vertical to 2× design. Independent read-out by KEC Engineering Consultancy.'],
  [35, 'prj_0008', 'Raft reinforcement fixing — 1,150 t', 'Engr. Suresh Kumar', 'High', 'In Progress', -7, 14, '32 mm B500B both ways, cover 75 mm. Bar schedule BS-04 Rev A. 3 no. tie-downs every bay.'],
  [36, 'prj_0008', 'Diaphragm wall panel quality — sonic & coring', 'Engr. Tariq Al-Mutairi', 'Medium', 'Pending', 1, 12, 'Sonic log every panel. Core 5%, 3 cores per pour length. Verticality 1:300 max.'],
  [37, 'prj_0008', 'Waterproofing 48-hr flood test — basement L2', 'Engr. Hisham Sayed', 'Medium', 'Completed', -16, -11, 'Flooded to 150 mm. No ingress at 3 locations; all patched. Test certificate WT-041 issued.'],
  [38, 'prj_0008', 'Concrete trial mix — C40/50 for transfer slab', 'Engr. Sami Al-Anazi', 'Medium', 'Completed', -24, -19, 'Slump 180 ±25 mm, 3-s cube 38.5 MPa avg. Admixture Dosage 1.8% confirmed.'],

  // prj_0009 cancelled
  [39, 'prj_0009', 'Demobilisation and site handback', 'Engr. Naveed Anjum', 'High', 'Completed', -60, -40, 'Plant, temporary works and materials removed. Site left in a clean and safe condition per the contract.'],
];

// Drop the placeholder rows used only to pad the on-hold project.
const tasks: Task[] = taskSeeds
  .filter((t) => t[5] !== ('On Hold Placeholder' as unknown as Task['status']))
  .map(([n, projectId, name, assignee, priority, status, s, due, description]) => ({
    id: id('tsk', n),
    projectId,
    name,
    description,
    assignee,
    priority,
    startDate: d(s),
    dueDate: d(due),
    status,
    notes: '',
    createdAt: dt(s, 8, 0),
    updatedAt: dt(Math.max(s, -3), 12, 30),
  }));

/* ------------------------------ site reports ---------------------------- */

type ReportSeed = [
  number,
  string,
  number,
  string,
  SiteReport['weather'],
  number,
  number,
  number,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string
];

const reportSeeds: ReportSeed[] = [
  [1, 'prj_0001', -1, 'Ch. 9+400 viaduct alignment, Al Malqa', 'Hot & Sunny', 44, 27, 96, 'Engr. Sami Al-Anazi; Engr. Suresh Kumar; Engr. Tariq Al-Mutairi',
    'Segment P14 post-tensioning completed for strands 1–8 (8 of 16). Grout injection commenced at 15:40 and completed 17:20. Survey check on camber: +11 mm against predicted, within tolerance.',
    'Strands 9–16 stressing on progress (72%). Reinforcement for segment P15 staged on the ground. Formwork for P14 struck after 14 h.',
    'Ready-mix C50/60 — 148 m³. Wire rope 18 mm — 6 coils. Grout 200 kg. Timber packing 400 pcs.',
    'Crane 80 t (post-tensioning gantry), 2 no. transit mixers, 1 no. boom lift 18 m, concrete pump 48 m³/h. Standby generator 200 kVA.',
    'Post-tensioning gantry wheel bearing noise at anchorage 4 — engineering advised to grease and monitor. No stoppage.',
    'Pre-shift briefing delivered. Full PPE compliance verified. Barrier and edge-protection integrity inspected on the deck. One operative reported heat-stress symptoms, treated on site per the heat illness protocol and stood down for the shift. Water station replenished.',
    'Complete stressing of all 16 strands and grout. Strip P14 formwork. Issue pour request for segment P15 to 05:00. Chase grout cube results.',
    'Afternoon wind gusts reached 34 km/h; dust screens re-secured on the east face. Dust-storm protocol Level 1 remains in place.'],
  [2, 'prj_0002', -1, 'Ch. 6+500 utility corridor, Al Aqiq', 'Hazy', 39, 26, 74, 'Engr. Rashid Al-Harbi; Engr. Naveed Anjum; Mr. Joseph Mathew',
    'Duct-bank trench excavated 42 m (ch. 6+458 to 6+500) with shoring installation. Base blinding placed and levelled over 30 m. Two existing duct banks located and exposed.',
    'Trench shoring and trench plate installation at 8 m intervals. Utility crossing permit application lodged with SEC for the 11 kV diversion.',
    'Cement 42.5N — 180 bags. Aggregates 20 mm — 12 m³. GI duct 150 mm — 36 m. Sand bedding 6 m³.',
    'Backhoe loader 1 no., water bowser, compactor plate 2 no., generator 100 kVA, tipper 3 no.',
    'SEC protection team requested a 24-hr notice before excavation within 5 m of the existing 11 kV run. Programme adjusted accordingly; notice issued.',
    'Trench-box daily inspection completed and recorded. Pedestrian access maintained to the mosque gate at all times. Traffic marshal deployment per TMP-RDW-07 confirmed at both ends. No incidents reported.',
    'Continue trench to 6+560. Install GI duct and joint. Concrete haunching. Reinstate the temporary traffic barrier over the completed section.',
    'Dust accumulation on the running lanes — water tanker increased to 3 passes per shift. Air quality monitor reading PM10 78 µg/m³ (acceptable).'],
  [3, 'prj_0004', -1, 'Warehouse Block C, grid line 3–5, Dammam 2nd Industrial City', 'Clear / Sunny', 41, 26, 61, 'Engr. Ahmed Hassan; Engr. Naveed Anjum; Mr. Khalid Al-Otaibi',
    'Frames F13 and F14 erected, plumbed and bolted (58 of 62 bolts per bay). Bolt torque verification by the QC inspector on 40% of the connections. Crane stand-down at 11:30 due to rising wind.',
    'Frame F15 bolt-up at level +7.2 m. Roof purlin stringer for bay 4 being installed. Anchor-bolt survey at grid line 4 scheduled for 07:00.',
    'Bolts M24 10.9 — 480 pcs. Erection bolts M20 — 1,240 pcs. Zinc-rich primer — 60 L. Safety harness — 12 pcs issued.',
    'Mobile crane 250 t (main), telehandler 4 t, boom lift 21 m, welding sets 6 no., torque wrenches 8 no.',
    'Wrench calibration certificate for two torque wrenches expired. Both removed from service and sent for recalibration; replacement units hired same day. Erection continued with the calibrated set only.',
    'Working at height briefing repeated at the pre-shift meeting. 100% harness inspection completed, two harnesses withdrawn (damaged webbing). Exclusion zone enforced beneath the lift. No incidents over 2,400 person-hours.',
    'Erect F15 and F16. Complete bolt torque verification. Begin roof purlin installation to bay 4. Prepare lift plan for the F17–F20 sequence.',
    'Weld inspection report WIR-033 closed with 2 minor observations. Crane fuel bowser delivery booked for the afternoon.'],
  [4, 'prj_0007', -1, 'Khobar Corniche revetment, ch. 2+400 to 2+900', 'Extreme Heat', 46, 32, 53, 'Engr. Omar Farouk; Engr. Ahmed Hassan; Mr. Joseph Mathew',
    'Quarry run rock placement 1,180 m³ completed in two layers across 95 m of frontage. Geotextile separator laid over 95 m. Marine growth inspection at the 6-monthly interval recorded.',
    'Rock placement continuing to ch. 2+895. Crane barge loading armour units for tomorrow\'s shift. Coping beam formwork staged on the promenade.',
    'Rock 2–5 t — 1,180 m³. Geotextile 300 g/m² — 380 m². Armour units (8 t) — 26 units loaded.',
    'Crane barge 600 t, tug 2 no., workboat 1 no., 2 no. 5 t mobile cranes on the promenade, water tanker.',
    'Ambient temperature 46 °C triggered the high-heat work-rest regime. Marine shift reduced from 8 h to 6 h with mandatory 20-min rest breaks hourly. No work-stoppage required; production below plan.',
    'Heat illness prevention plan in force. Hydration stations at 3 points with shaded rest area. Buddy system applied. Pre-shift medical check for all 53 workers. No heat-related casualties.',
    'Complete rock placement to ch. 2+940. Place remaining armour units if the tidal window allows. Set out coping beam reinforcement.',
    'Algal bloom observed in the nearshore zone by the environmental monitor — not attributed to site activity. Continued monitoring requested by the client.'],
  [5, 'prj_0008', -1, 'Basement raft, Hittin, Riyadh', 'Hot & Sunny', 40, 25, 88, 'Engr. Mohammed Imran; Engr. Suresh Kumar; Engr. Sami Al-Anazi',
    'Raft reinforcement fixing continued on the east mat, 1,150 t total, 780 t placed (67.9%). Lap couplers installed and torque-checked at 30 locations, all within 1,050 N·m ±5%. Access walkways set out.',
    'East mat layer 2 fixing. Chair and cover blocks audit. Pile head breakout inspection for P41–P52 outstanding — foreman to clear the excavation.',
    'Rebar B500B Ø32 — 62 t. Rebar B500B Ø25 — 28 t. Cover blocks 75 mm — 9,400 pcs. Tie wire — 180 kg. Chairs 800 t-capacity — 320 pcs.',
    'Tower crane 80 m, mobile crane 60 t, concrete pump 72 m³/h, 2 no. vibrators, cutting station, 1 no. water tanker.',
    'Two cover blocks on the mat edge were found at 55 mm instead of the 75 mm specified. Both re-set and the area re-audited. Non-conformance NCR-044 raised.',
    'Cut-to-cut laceration hazard re-briefed after a near-miss at the cutting station. Blade guards verified. Housekeeping check: off-cuts cleared from the mat walkways. 8 days without a lost-time incident.',
    'Complete the east mat. Issue the pour request for the raft, 1,780 m³ in 3 lifts. Complete FEA on pile P45, P46, P47.',
    'Ambient temperature rising; pour window moved to 20:00–04:00 to avoid midday placement. Ice dosing approved by the consultant for the night pour.'],
  [6, 'prj_0001', -2, 'Ch. 9+400, Station Box SB-3', 'Dust Storm', 38, 25, 61, 'Engr. Sami Al-Anazi; Engr. Tariq Al-Mutairi',
    'Station box SB-3 2nd-stage slab reinforcement 62% fixed. Dust storm developed at 13:20; reinforcement tying suspended at 13:40 and site cleared by 14:10 as instructed by the HSE plan.',
    'Grain size distribution tests complete for the imported fill material. Cube results for the SB-3 1st-stage slab returned: 7-day average 34.8 MPa, 28-day 46.1 MPa against 45 MPa specified — accepted.',
    'Rebar B500B Ø20 — 31 t. Rebar B500B Ø16 — 18 t. Cover blocks — 5,200 pcs. Drinking water 1,200 L issued.',
    'Tower crane 80 m, 1 no. water bowser for dust suppression, welding sets 4 no.',
    'Dust storm suspended all lifting and concrete work for 46 minutes per the protocol. Rebar securing verified on all levels before resumption. Visibility monitoring station 2 exceeded the 2,000 m threshold twice.',
    'Dust storm procedure briefed on the previous shift. No injuries. Emergency communication tree tested by radio check at 11:00 — all foremen responded.',
    'Restart SB-3 slab tying. Resumption certificate signed by the site senior engineer before rebars were loaded. Pour SB-3 L3 subject to a 48-hr cube result.',
    'The client was notified of the stoppage within 30 minutes as required. Dust suppression increased to 4 passes per hour.'],
  [7, 'prj_0003', -30, 'Al Amarah WTP, Jeddah', 'Clear / Sunny', 36, 24, 42, 'Engr. Suresh Kumar; Engr. Ahmed Hassan; Engr. Sami Al-Anazi',
    'Final snag item SN-214 closed (handrail fixings, aeration gallery walkway). Joint practical completion walkdown with the NWSC resident engineer and the O&M superintendent.',
    'As-built compilation finalised. Outstanding items reduced to 2 minor snags in the dosing room.',
    'Paint 52 L, primer 20 L, galvanised fasteners 400 pcs, M12 8.8 bolts 260 pcs.',
    '2 no. scissor lifts, flatbed truck for document hand-over, cleaning crew.',
    'Two NWSC observations regarding the sludge scraper gearbox noise. Access to be opened for inspection in the defects period.',
    'Final site clean-down and waste removal completed. Waste transfer note obtained from the licensed carrier. Housekeeping inspected and signed off.',
    'Complete the last two snags. Issue the Rev-C as-built dossier. Prepare the O&M training programme with NWSC.',
    'Practical completion certificate issued on site. 12 months defects liability begins.'],
  [8, 'prj_0005', -8, 'Jubail IC3 substation, SEC site', 'Hazy', 41, 27, 18, 'Engr. Hisham Sayed; Engr. Omar Farouk',
    'Secured stoppage audit completed. All 220 kV equipment bagged, glands sealed and tagged. Cable trench covers reinstated and locked. Site photographed for the preservation record.',
    'Inventory of stored steel supports and cable trench materials verified against the stores register. No discrepancies.',
    'Desiccant 40 kg, sealing compound 24 kg, anti-condensation film 12 rolls.',
    '24-hr security, dehumidification unit 1 no., standby generator 100 kVA.',
    'SEC instruction is a formal hold, not a termination. No works permitted on the 220 kV equipment. Two-weekly site inspection continues with a report to the SEC regional office.',
    'Security induction re-issued. Fence perimeter inspection — 2 m of mesh damaged by a vehicle, repaired. Fire and emergency drill not required while on hold; first-aid cover confirmed.',
    'Continue the fortnightly inspection and submit the stoppage report. Chase the protection-coordination study with the SEC design office.',
    'Insulation resistance readings on the 34.5 kV cable circuit logged monthly as a preservation measure.'],
  [9, 'prj_0002', -3, 'Ch. 6+500, Al Aqiq interchange', 'Partly Cloudy', 37, 24, 80, 'Engr. Rashid Al-Harbi; Engr. Omar Farouk; Mr. Joseph Mathew',
    'ATMS gantry foundations 5 of 8 cast and cured. Foundation survey checked against the setting-out: horizontal deviation within 4 mm, vertical within 3 mm. Foundation certification forms prepared for SEC witness.',
    'Gantry foundation steel fixing at pier P4. Rebar inspection of the P4 pile cap submitted for consultant approval. Drainage gully installation on the westbound approach.',
    'Cement 42.5N — 340 bags, aggregates 40 mm — 28 m³, sand — 18 m³. Gully gratings 24 pcs. Reinforcement B500B Ø25 — 19 t.',
    'Truck-mounted concrete pump 36 m³/h, vibrators 4 no., water bowser, compaction plate.',
    'Consultant requested a supplementary pile-cap rebar schedule to show the shear reinforcement detail. Issued same day as SK-018.',
    'Live traffic management reviewed with the police liaison officer. Signal timing adjusted for the diversion. Segregated pedestrian route signed and swept. No incidents or near-misses reported this shift.',
    'Complete the remaining three gantry foundations. Submit foundation certification for SEC witness. Continue P4 pile-cap formwork.',
    'Forecast indicates rain on Thursday — excavation stability plan to be reviewed before the weekend. Dewatering pumps on standby.'],
  [10, 'prj_0006', -3, 'Tabuk site, Outpatient Block plot', 'Hot & Sunny', 38, 23, 22, 'Engr. Sami Al-Anazi; Engr. Rashid Al-Harbi; Mr. Joseph Mathew',
    'Site establishment inspected and certified. Hoarding graphics installed, signage bilingual per MoH requirement. Welfare facilities operational: 4 cabins, ablution and potable water station.',
    'Topographic survey of the plot re-issued with the 0.5 m contour. Rev D IFC comment register collated — 47 open items, 31 closed.',
    'Survey markers 12 pcs, boundary pegs 34 pcs, survey nails 200 pcs.',
    'Total station 1 no., tripod 1 no., 4×4 vehicle 1 no., water bowser.',
    'Geotechnical report has revised the founding level down by 0.6 m at the NE corner. This affects the basement volume, the piling depth and the tender quantity. Commercial impact to be quantified before the next client meeting.',
    'Site establishment fire and emergency plan issued to the HSE file. Water supply tested — potable certificate on file. First-aid kit and an AED available on site. Induction records started.',
    'Complete the Rev D design review and issue the comment response. Obtain the MoH tender clearance for the enabling works package.',
    'Setting out benchmark BM-01 established and witnessed. Compaction specification for the platform fill to be confirmed with the geotechnical consultant.'],
];

const siteReports: SiteReport[] = reportSeeds.map(
  ([n, projectId, dayOffset, siteLocation, weather, tempHigh, tempLow, workers, engineers, workCompleted, workInProgress, materialsUsed, equipmentUsed, issues, safetyObservations, tomorrowPlan, notes]) => ({
    id: id('dsr', n),
    refNo: `SAX-DSR-${d(dayOffset).replace(/-/g, '').slice(2)}-${String(n).padStart(3, '0')}`,
    projectId,
    date: d(dayOffset),
    siteLocation,
    weather,
    tempHigh,
    tempLow,
    workers,
    engineers: engineers.split('; ').map((s) => s.trim()),
    workCompleted,
    workInProgress,
    materialsUsed,
    equipmentUsed,
    issues,
    safetyObservations,
    tomorrowPlan,
    notes,
    photos: [],
    createdAt: dt(dayOffset, 16, 30),
    updatedAt: dt(dayOffset, 16, 30),
  }),
);

/* -------------------------------- materials ----------------------------- */

type MatSeed = [
  number,
  string,
  Material['category'],
  number,
  Material['unit'],
  number,
  number,
  string,
  string,
  number,
  string
];

const materialSeeds: MatSeed[] = [
  [1, 'prj_0001', 'Cement & Binders', 1240, 'bag', 19.4, 6200, 'Al Yamama Cement — Riyadh Plant', 'Al Rajhi Building Materials', 500, 'Delivery by 32 t articulated trailer. Batch numbers traceable on the delivery note.'],
  [2, 'prj_0001', 'Aggregates', 640, 'm³', 78, 9000, 'Crushed limestone 3/4" (max 20 mm)', 'Bin Quraya Aggregates', 250, 'Sieve analysis re-tested 3 weeks ago: 2.36 mm 6% flakiness index.'],
  [3, 'prj_0001', 'Aggregates', 410, 'm³', 62, 7200, 'Wadi sand (fine aggregate, washed)', 'Bin Quraya Aggregates', 200, 'Chloride content 0.04% — compliant with BS 882.'],
  [4, 'prj_0001', 'Reinforcement Steel', 268, 'ton', 4180, 188000, 'Rebar B500B Ø12 mm — 12 m lengths', 'Al Assaf Steel Industries', 80, 'Mill certificate EN 10204 3.1 filed per delivery lot.'],
  [5, 'prj_0001', 'Reinforcement Steel', 194, 'ton', 4120, 161000, 'Rebar B500B Ø16 mm — 12 m lengths', 'Al Assaf Steel Industries', 60, 'Bar bending schedule BS-04 Rev A. Bend test certificates on file.'],
  [6, 'prj_0001', 'Reinforcement Steel', 96, 'ton', 4050, 140000, 'Rebar B500B Ø25 mm — 12 m lengths', 'Al Assaf Steel Industries', 40, 'Couplers for lap splicing, torque 1,050 N·m.'],
  [7, 'prj_0001', 'Reinforcement Steel', 42, 'ton', 4010, 128000, 'Rebar B500B Ø32 mm — 12 m lengths', 'Al Assaf Steel Industries', 25, 'Bar schedule for the raft and pile caps.'],
  [8, 'prj_0001', 'Ready-Mix Concrete', 186, 'm³', 215, 12200, 'Ready-mix C50/60 (viaduct segments)', 'Saudi Readymix Co.', 100, 'Mix design MD-1 approved. Slump 180 ±25 mm. Ice dosing in summer.'],
  [9, 'prj_0001', 'Ready-Mix Concrete', 128, 'm³', 215, 12200, 'Ready-mix C40/50 (station box, foundations)', 'Saudi Readymix Co.', 80, 'Same supplier; separate ticket numbering.'],
  [10, 'prj_0001', 'Formwork & Shuttering', 640, 'sheet', 165, 3400, 'Plywood formwork 18 mm (BS 5268 grade)', 'Rawabi Trading', 300, 'Film-faced, reusable. Faced 8 times before scrapping.'],
  [11, 'prj_0001', 'Safety & Consumables', 34, 'pcs', 32, 380, 'Safety helmet (white, chin strap)', 'Zamil Safety Supplies', 40, 'Issued on site induction; not returned to stores.'],
  [12, 'prj_0001', 'Waterproofing & Insulation', 0, 'm²', 86, 11200, 'Elastomeric membrane 3 mm (podium)', 'Saudi Waterproofing Products', 400, 'Procurement pending — the client specification requires a 15-year warranty.'],
  [13, 'prj_0002', 'Cement & Binders', 860, 'bag', 19.4, 6200, 'Cement 42.5N — bulk delivery', 'Al Yamama Cement — Riyadh Plant', 400, 'Bags from a single plant to limit variation across pours.'],
  [14, 'prj_0002', 'Aggregates', 1120, 'm³', 76, 8800, 'Sub-base Type B (granular, 0–40 mm)', 'Bin Quraya Aggregates', 400, 'Proctor MDD 2.02 g/cm³ confirmed by the test house.'],
  [15, 'prj_0002', 'Reinforcement Steel', 88, 'ton', 4090, 152000, 'Rebar B500B Ø25 mm — 12 m lengths', 'Al Assaf Steel Industries', 30, 'ATMS gantry and pile-cap reinforcement.'],
  [16, 'prj_0002', 'Pipes & Fittings', 340, 'm', 118, 7800, 'Galvanised steel duct 150 mm', 'Aljomaih General Trading', 500, 'For ATMS and street lighting duct-bank.'],
  [17, 'prj_0002', 'Masonry & Blocks', 3200, 'pcs', 5.4, 2400, 'AAC block 200 mm (dry density 600 kg/m³)', 'Hajjaj Trading', 1500, 'Adhesive mortar rather than cement mortar.'],
  [18, 'prj_0002', 'Safety & Consumables', 0, 'pcs', 78, 140, 'Nylon webbing sling 2 t, 2 m', 'Zamil Safety Supplies', 8, 'Worn during the crossing lifts. Certified test date 2027-01.'],
  [19, 'prj_0004', 'Structural Steel', 214, 'ton', 7450, 260000, 'PEB tapered frame members — 12 m bays', 'Saudi Pre-Eng Building Systems', 120, 'Mill certificates and weld procedure specs approved.'],
  [20, 'prj_0004', 'Structural Steel', 96, 'ton', 7450, 260000, 'PEB purlins Z275, 1.8 m pitch', 'Saudi Pre-Eng Building Systems', 60, 'Z275 galvanising, 85 µm coating.'],
  [21, 'prj_0004', 'Structural Steel', 3.2, 'ton', 4820, 41000, 'Anchor bolt assembly M24 10.9 (incl. plate & nut)', 'Aljomaih General Trading', 4, 'Firmware is the single largest procurement risk on this package.'],
  [22, 'prj_0004', 'Safety & Consumables', 68, 'litre', 96, 340, 'Zinc-rich primer (organic type)', 'Bin Quraya Industrial Supplies', 30, 'Dry film thickness 65 µm minimum, verified by the QC inspector.'],
  [23, 'prj_0004', 'Ready-Mix Concrete', 320, 'm³', 198, 9800, 'Ready-mix C35/45 (floor slab, footings)', 'Saudi Readymix Co. — Dammam', 150, '200 mm slab with A393 mesh.'],
  [24, 'prj_0004', 'Safety & Consumables', 46, 'pcs', 18, 220, 'Galvanised safety harness — full body', 'Zamil Safety Supplies', 20, 'Inspected weekly and withdrawn if any webbing damage.'],
  [25, 'prj_0007', 'Aggregates', 4860, 'm³', 68, 12400, 'Quarry run rock 2–5 t (armour stone, angular)', 'Najran Quarrying Co.', 800, 'Angularity index test passed. No weathered material on the face.'],
  [26, 'prj_0007', 'Waterproofing & Insulation', 640, 'm²', 44, 3800, 'Geotextile separator 300 g/m²', 'Bin Quraya Industrial Supplies', 600, 'Laid ahead of rock placement — do not expose to sun for more than one shift.'],
  [27, 'prj_0007', 'Ready-Mix Concrete', 148, 'm³', 212, 10500, 'Ready-mix C35/45 (coping beam, promenade)', 'Saudi Readymix Co. — Khobar', 100, 'Chloride-resistant mix specification for the tide zone.'],
  [28, 'prj_0008', 'Reinforcement Steel', 34, 'ton', 4210, 168000, 'Rebar B500B Ø32 mm — raft, 900 mm BESD piles', 'Al Assaf Steel Industries', 15, 'Staggered 1,150 t placed. Stock is now the constraint on the pour.'],
  [29, 'prj_0008', 'Reinforcement Steel', 58, 'ton', 4130, 154000, 'Rebar B500B Ø25 mm — walls, pile caps', 'Al Assaf Steel Industries', 20, 'Spliced with mechanical couplers where the lap would exceed 45d.'],
  [30, 'prj_0008', 'Ready-Mix Concrete', 240, 'm³', 232, 12800, 'Ready-mix C40/50 (transfer slab, pile caps)', 'Saudi Readymix Co.', 120, 'Raft pour 1,780 m³ planned in 3 lifts to limit thermal cracking.'],
  [31, 'prj_0008', 'Waterproofing & Insulation', 1150, 'm²', 86, 12500, 'Ponding-applied membrane 3 mm, 2 coat', 'Saudi Waterproofing Products', 1000, 'Applied to the raft and basement walls. 48-hr flood test passed on L2.'],
  [32, 'prj_0008', 'Finishes & Coatings', 140, 'litre', 42, 3100, 'Protective coating for buried concrete (2 coat)', 'Bin Quraya Industrial Supplies', 120, 'Required by the waterproofing warranty.'],
  [33, 'prj_0005', 'Structural Steel', 42, 'ton', 7450, 58000, 'Galvanised steel support frames (trench, equipment)', 'Saudi Pre-Eng Building Systems', 10, 'Preserved on site during the client hold.'],
  [34, 'prj_0005', 'Electrical & Instrumentation', 3, 'pcs', 148000, 320000, '220 kV GIS switchgear panel (line-up of 3)', 'Alstom / local agent', 3, 'Long-lead, 34 weeks. Purchase order on hold pending the client instruction.'],
  [35, 'prj_0005', 'Pipes & Fittings', 260, 'm', 890, 54000, 'Ductile iron pipe 300 mm, K9 (inbound line)', 'Bin Quraya Pipe Systems', 400, 'Delivered and stored on the hardstanding, capped.'],
  [36, 'prj_0005', 'Cement & Binders', 0, 'bag', 19.4, 5800, 'Cement 42.5N — trench bedding', 'Al Yamama Cement — Jubail', 150, 'Stock issued to the trench works. Reorder required.'],
  [37, 'prj_0006', 'Cement & Binders', 0, 'bag', 19.4, 5600, 'Cement 42.5N — compound slab and kerbs', 'Al Yamama Cement — Tabuk', 200, 'Awaiting the enabling works package release.'],
  [38, 'prj_0006', 'Safety & Consumables', 96, 'pcs', 22, 2100, 'Fire extinguisher 6 kg ABC (site establishment)', 'Zamil Safety Supplies', 40, 'Inspected and tagged per NFPA 10.'],
  [39, 'prj_0003', 'Ready-Mix Concrete', 0, 'm³', 198, 8900, 'Ready-mix C35/45 (dosing room slabs)', 'Saudi Readymix Co. — Jeddah', 60, 'Contract complete. Residual 14 m³ returned to the public highway as waste — stock written off.'],
  [40, 'prj_0003', 'Electrical & Instrumentation', 0, 'pcs', 1450, 18500, 'Circuit breaker 250 A, 4-pole (MCC final)', 'Aljomaih General Trading', 10, 'As-built documentation and O&M manuals handed to NWSC.'],
  [41, 'prj_0001', 'Safety & Consumables', 24, 'pcs', 78, 1300, 'Nylon sling 2 t, 4 m (post-tensioning)', 'Zamil Safety Supplies', 6, 'Test certificate renewed 2026-08.'],
  [42, 'prj_0002', 'Finishes & Coatings', 220, 'litre', 38, 1900, 'Thermoplastic road-marking paint (white)', 'Bin Quraya Industrial Supplies', 150, 'Retroreflectivity compliant with the TMP requirements.'],
  [43, 'prj_0007', 'Safety & Consumables', 12, 'pcs', 240, 5200, 'Life-ring with light (quay-side station)', 'Zamil Safety Supplies', 8, 'Mounted at 6 stations along the promenade.'],
  [44, 'prj_0008', 'Safety & Consumables', 84, 'pcs', 34, 1200, 'Rebar cover spacer 75 mm (plastic, stackable)', 'Rawabi Trading', 200, 'Sample approved by the consultant for the raft pour.'],
];

const materials: Material[] = materialSeeds.map(
  ([n, projectId, category, quantity, unit, unitPrice, , spec, supplier, minStock, notes]) => ({
    id: id('mat', n),
    name: spec,
    category,
    quantity,
    unit,
    unitPrice,
    supplier,
    projectId,
    receivedDate: d(-(60 + n * 3)),
    minStock,
    notes,
    createdAt: dt(-(60 + n * 3), 10, 0),
    updatedAt: dt(-Math.max(1, n % 9), 11, 20),
  }),
);

/* -------------------------------- expenses ------------------------------ */

const vendorPool: Record<string, string[]> = {
  Materials: ['Al Rajhi Building Materials', 'Bin Quraya Aggregates', 'Rawabi Trading', 'Al Assaf Steel Industries', 'Hajjaj Trading'],
  'Labour & Wages': ['Musallam Contracting Labour', 'Al Khozama Manpower', 'Site payroll — direct'],
  'Equipment & Plant': ['HESCO Heavy Equipment Rental', 'Zamil Equipment', 'Al-Yasra Plant Hire'],
  Subcontractors: ['Al Fares Steel Fabrication', 'Crest Concrete Pumping', 'Najran Piling & Foundations'],
  'Petrol & Fuel': ['Aldrees Petroleum', 'Al-Drees Fuels — site bowser'],
  'Transport & Logistics': ['Riyadh Transport Services', 'Gulf Freight Solutions'],
  'Site Office & Camp': ['Al Manar Site Services', 'Manasat Facilities Management'],
  Utilities: ['Saudi Electricity Company (SEC)', 'Saudi National Water Company (SWCC)'],
  'Professional Fees': ['KEC Engineering Consultancy', 'Saber third-party QC', 'Drees & Sommer — MEP'],
  'Hire Charges': ['HESCO Heavy Equipment Rental', 'Gulf Crane Hire'],
  'Insurance & Permits': ['Tawuniya Insurance', 'Riyadh Municipality — permits'],
  Other: ['Site consumables', 'Bank charges and transfers'],
};

const expenseSeeds: [number, string, Expense['category'], string, number, number, number, Expense['paymentStatus'], string][] = [];

function rnd(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

// Build a 12-month expense ledger that is internally consistent with the
// project budgets: cumulative spend sits below the budget for live projects.
const expensePlan: { projectId: string; totalShare: number; months: number; rate: number }[] = [
  { projectId: 'prj_0001', totalShare: 0.86, months: 12, rate: 0.9 },
  { projectId: 'prj_0002', totalShare: 0.78, months: 12, rate: 0.85 },
  { projectId: 'prj_0003', totalShare: 0.97, months: 12, rate: 1.0 },
  { projectId: 'prj_0004', totalShare: 0.44, months: 10, rate: 0.8 },
  { projectId: 'prj_0005', totalShare: 0.36, months: 7, rate: 0.7 },
  { projectId: 'prj_0006', totalShare: 0.03, months: 3, rate: 0.4 },
  { projectId: 'prj_0007', totalShare: 0.71, months: 11, rate: 0.9 },
  { projectId: 'prj_0008', totalShare: 0.24, months: 5, rate: 0.75 },
  { projectId: 'prj_0009', totalShare: 0.16, months: 9, rate: 0.6 },
];

let expN = 0;
for (const plan of expensePlan) {
  const project = projects.find((p) => p.id === plan.projectId)!;
  const monthTotal = (project.budget * plan.totalShare) / plan.months;
  for (let m = plan.months - 1; m >= 0; m -= 1) {
    const nEntries = 3 + Math.floor(rnd(plan.projectId.length + m) * 3);
    for (let e = 0; e < nEntries; e += 1) {
      const cats = Object.keys(vendorPool);
      const cat = cats[Math.floor(rnd(plan.projectId.length * 31 + m * 7 + e) * cats.length)] as Expense['category'];
      const vendors = vendorPool[cat];
      const vendor = vendors[Math.floor(rnd(m * 13 + e * 5 + cat.length) * vendors.length)];
      const dayOffset = -(m * 30) - Math.floor(rnd(m * 3 + e) * 27);
      const base = monthTotal / nEntries;
      const jitter = 0.55 + rnd(m * 11 + e * 7) * 0.95;
      const amount = Math.round((base * jitter * plan.rate) / 50) * 50;
      if (amount <= 0) continue;
      const age = -dayOffset;
      const paid = age > 45 || rnd(e * 13 + m) > 0.55;
      const partial = !paid && rnd(e * 5 + m * 3) > 0.5;
      expN += 1;
      expenseSeeds.push([
        expN,
        plan.projectId,
        cat,
        `${cat} — ${project.code.split('-').slice(1, 3).join(' ')} ${['works', 'order', 'certificates', 'batch', 'period', 'package'][e % 6]}`,
        amount,
        dayOffset,
        Math.floor(rnd(expN * 7) * 9000) + 1000,
        paid ? 'Paid' : partial ? 'Partially Paid' : age > 30 ? 'Overdue' : 'Pending',
        '',
      ]);
    }
  }
}

const expenses: Expense[] = expenseSeeds.map(
  ([n, projectId, category, description, amount, dayOffset, , paymentStatus]) => ({
    id: id('exp', n),
    projectId,
    category,
    description,
    amount,
    date: d(dayOffset),
    vendor: vendorPool[category][n % vendorPool[category].length],
    paymentStatus,
    refNo: `INV-${2000 + n * 7}`,
    notes: '',
    createdAt: dt(dayOffset, 13, 10),
    updatedAt: dt(dayOffset, 13, 10),
  }),
);

/* -------------------------------- documents ----------------------------- */

const documentSeeds: [number, string, DocRecord['category'], string, string, number, string, string][] = [
  [1, 'prj_0001', 'Drawings', 'P14 Post-Tensioning Layout — IFC', 'SAX-MTR-4-P14-PT-IFC.pdf', 4_820_000, 'Rev C', 'Post-tensioning duct layout and stressing schedule for viaduct segment P14.'],
  [2, 'prj_0001', 'Contracts', 'Subcontract — Post-Tensioning Works', 'SAX-MTR-SUB-PT-2026.pdf', 2_140_000, 'Rev 0', 'Signed subcontract with Al Fares Steel Fabrication for specialised PT works.'],
  [3, 'prj_0001', 'Reports', 'Monthly Progress Report — September 2026', 'SAX-MTR-PR-2026-09.pdf', 6_400_000, 'Rev 0', 'Progress 62%, 41 days ahead on the critical path; cost position within budget.'],
  [4, 'prj_0001', 'Site Photographs', 'Deck Pour P14 — 18 Images', 'SAX-MTR-DECK-P14-SET.zip', 28_600_000, 'Rev 0', 'Pour sequence and finish documentation.'],
  [5, 'prj_0002', 'Drawings', 'Utility Diversion Layout — Ch. 6+200 to 7+000', 'SAX-RDW-UTIL-LAYOUT-IFC.pdf', 3_360_000, 'Rev B', 'MV/HV diversion and duct-bank layout.'],
  [6, 'prj_0002', 'Reports', 'SEC Foundation Certification Pack', 'SAX-RDW-SEC-FND-CERT.pdf', 1_880_000, 'Rev 1', 'Gantry foundation certification submitted for SEC witness.'],
  [7, 'prj_0003', 'Drawings', 'As-Built IFC Dossier — Rev C', 'SAX-WRP-ASBUILT-REVC.pdf', 41_200_000, 'Rev C', '214 sheets: process, mechanical, electrical, instrumentation, civil.'],
  [8, 'prj_0003', 'Reports', 'Practical Completion Certificate', 'SAX-WRP-PC-CERT.pdf', 940_000, 'Rev 0', 'Signed by the NWSC resident engineer.'],
  [9, 'prj_0003', 'Contracts', 'O&M Handover & Training Record', 'SAX-WRP-OM-HANDOVER.pdf', 1_260_000, 'Rev 0', '5-day training delivered to 11 operators.'],
  [10, 'prj_0004', 'Drawings', 'Crane Lift Plan — Frames F13 to F20', 'SAX-DLC-LIFTPLAN-LP07.pdf', 2_640_000, 'Rev 2', 'Lift plan for the main frame erection sequence, 250 t mobile crane.'],
  [11, 'prj_0004', 'Reports', 'Weekly Report — W40', 'SAX-DLC-WR-2026-W40.pdf', 780_000, 'Rev 0', 'Frames F13/F14 complete; bolt torque verification on schedule.'],
  [12, 'prj_0005', 'Invoices', 'SEC Variation — Protection Coordination Study', 'SAX-JUB-SEC-VAR-014.pdf', 1_120_000, 'Rev 0', 'Formal instruction to hold works; variation raised for the study cost.'],
  [13, 'prj_0005', 'Reports', 'Secured Stoppage Report', 'SAX-JUB-STOPPAGE-RPT.pdf', 1_640_000, 'Rev 0', 'Preservation record and fortnightly inspection log.'],
  [14, 'prj_0006', 'Drawings', 'Outpatient Block General Arrangement — Rev D', 'SAX-TUK-GA-REVD.pdf', 8_920_000, 'Rev D', 'Awaiting IFC issue. 47 open coordination comments.'],
  [15, 'prj_0006', 'Certificates & Permits', 'MoH Site Access Permit', 'SAX-TUK-MOH-PERMIT.pdf', 460_000, 'Rev 0', 'Site access and temporary works permit from the Ministry of Health.'],
  [16, 'prj_0007', 'Technical Specifications', 'Revetment & Armour Specification', 'SAX-KHB-SPEC-REVET.pdf', 5_340_000, 'Rev 1', 'Rock gradation, geotextile and layer placement requirements.'],
  [17, 'prj_0007', 'Reports', 'Marine Environmental Monitoring — Q3', 'SAX-KHB-ENV-Q3.pdf', 2_180_000, 'Rev 0', 'Turbidity, noise and marine growth results for the quarter.'],
  [18, 'prj_0008', 'Drawings', 'Raft Reinforcement Bar Schedule', 'SAX-TWR-BS-04-REVA.pdf', 3_720_000, 'Rev A', 'Bar schedule for the 900 mm BESD pile raft, 1,150 t.'],
  [19, 'prj_0008', 'Reports', 'Pile Load Test Report — P45 to P47', 'SAX-TWR-PLT-009.pdf', 4_420_000, 'Rev 0', 'FEA and vertical load test results, independently witnessed.'],
  [20, 'prj_0008', 'Certificates & Permits', 'Basement Waterproofing 48-hr Test Certificate', 'SAX-TWR-WT-041.pdf', 520_000, 'Rev 0', 'No ingress recorded; certificate issued after the retest.'],
];

const documents: DocRecord[] = documentSeeds.map(
  ([n, projectId, category, name, fileName, size, rev, description]) => ({
    id: id('doc', n),
    projectId,
    name,
    category,
    fileName,
    storedName: `sample-${String(n).padStart(3, '0')}.bin`,
    mime: fileName.endsWith('.zip') ? 'application/zip' : 'application/pdf',
    size,
    uploadedAt: dt(-(n * 4), 10, 30),
    description,
    rev,
  }),
);

/* -------------------------------- profile ------------------------------- */

const profile: UserProfile = {
  name: 'Sami Al-Anazi',
  username: 's.alanzi',
  email: 's.alanzi@al-anazi-eng.com',
  role: 'Engineer',
  designation: 'Project Engineer — Civil Works',
  company: 'Al-Anazi Contracting Group Ltd.',
  phone: '+966 55 128 4470',
  location: 'Riyadh, Saudi Arabia',
  country: 'Saudi Arabia',
  employeeId: 'BAE-0412',
  bio: 'Project engineer with 11 years of civil and structural site experience across the Kingdom — metro viaducts, municipal road infrastructure, wastewater treatment, industrial warehousing and marine works. Responsible for site delivery, quality assurance, construction documentation and contractor supervision on multiple packages in Riyadh, Jeddah, Dammam, Jubail, Khobar and Tabuk.',
  photo: null,
  qualifications: [
    { id: 'q1', text: 'BEng Civil Engineering — University of Karachi, 2014' },
    { id: 'q2', text: 'Saudi Engineering Council (SEC) — Registered Engineer, Reg. 341882' },
    { id: 'q3', text: 'PMP® Certified Project Management Professional, 2021' },
    { id: 'q4', text: 'NEBOSH International Certificate in Occupational Health & Safety, 2019' },
    { id: 'q5', text: 'Certified in Welding Inspection (CSWIP 3.1) — TWI, 2020' },
  ],
  languages: [
    { id: 'l1', text: 'English — Fluent (professional working proficiency)' },
    { id: 'l2', text: 'Urdu — Native' },
    { id: 'l3', text: 'Arabic — Working knowledge (technical documents and site communication)' },
  ],
  memberships: [
    { id: 'm1', text: 'Saudi Engineering Council (SEC)' },
    { id: 'm2', text: 'Institution of Civil Engineers (ICE) — Graduate Member' },
    { id: 'm3', text: 'Project Management Institute (PMI) — PMP Chapter, Riyadh' },
  ],
};

/* -------------------------------- settings ------------------------------ */

const settings: Settings = {
  lang: 'en',
  theme: 'light',
  accent: 'petrol',
  density: 'comfortable',
  currency: 'SAR',
  currencyRate: 1,
  dateFormat: 'gregorian',
  notifications: {
    taskDue: true,
    taskOverdue: true,
    projectMilestone: true,
    lowStock: true,
    budgetAlert: true,
    dailyReport: true,
    emailDigest: false,
    digestFrequency: 'weekly',
    soundAlert: false,
  },
  security: {
    autoLockMinutes: 30,
    failedLockout: 5,
  },
  pdfFooter: 'Uncontrolled when printed. This report is issued by Al-Anazi Contracting Group Ltd. for the use of the project team and client representatives only.',
};

/* -------------------------------- account ------------------------------- */

export const DEMO_USERNAME = 's.alanzi';
export const DEMO_PASSWORD = 'Site@2026';
export const DEMO_SECURITY_ANSWER = 'SA-0412';

function buildAccount(): Account {
  const { hash, salt } = hashPassword(DEMO_PASSWORD);
  const ans = hashPassword(DEMO_SECURITY_ANSWER);
  return {
    username: DEMO_USERNAME,
    email: profile.email,
    displayName: profile.name,
    passwordHash: hash,
    passwordSalt: salt,
    securityQuestion: 'What is your employee ID number?',
    securityAnswerHash: ans.hash,
    securityAnswerSalt: ans.salt,
    failedAttempts: 0,
    lockedUntil: 0,
    recoveryToken: '',
    recoveryExpiry: 0,
    lastLoginAt: null,
    createdAt: dt(-400, 8, 0),
  };
}

/* -------------------------------- activity ------------------------------ */

function buildActivity(): ActivityEntry[] {
  const list: ActivityEntry[] = [];
  let n = 0;
  const push = (
    kind: ActivityEntry['kind'],
    action: ActivityEntry['action'],
    entityId: string,
    summary: string,
    projectId: string | null,
    at: string,
  ) => {
    n += 1;
    list.push({ id: `act_${String(n).padStart(4, '0')}`, at, kind, action, entityId, summary, projectId, actor: 'Engr. Sami Al-Anazi' });
  };

  push('task', 'update', 'tsk_0006', 'Weekly progress valuation & IPC-07 preparation — status set to Pending', 'prj_0001', dt(-0, 8, 12));
  push('site-report', 'create', 'dsr_0001', 'Daily Site Report filed — Ch. 9+400 viaduct alignment', 'prj_0001', dt(-1, 16, 35));
  push('material', 'update', 'mat_0004', 'Rebar B500B Ø12 mm — quantity reduced to 268 ton after issue to segments P13/P14', 'prj_0001', dt(-1, 11, 20));
  push('expense', 'create', 'exp_0001', 'Expense recorded — Materials, SAR 18,400 (Al Rajhi Building Materials)', 'prj_0001', dt(-1, 13, 10));
  push('site-report', 'create', 'dsr_0003', 'Daily Site Report filed — Warehouse Block C, Dammam', 'prj_0004', dt(-1, 16, 10));
  push('project', 'update', 'prj_0002', 'Progress updated to 78% — utility duct-bank package', 'prj_0002', dt(0, 8, 10));
  push('document', 'create', 'doc_0010', 'Document uploaded — Crane Lift Plan LP-07 Rev 2', 'prj_0004', dt(-2, 10, 30));
  push('task', 'update', 'tsk_0034', 'Pile load testing P45–P47 — status set to In Progress', 'prj_0008', dt(-2, 14, 5));
  push('site-report', 'create', 'dsr_0004', 'Daily Site Report filed — Khobar Cornisse revetment', 'prj_0007', dt(-2, 16, 40));
  push('expense', 'create', 'exp_0004', 'Expense recorded — Equipment & Plant, SAR 42,750 (HESCO Heavy Equipment Rental)', 'prj_0004', dt(-2, 15, 20));
  push('material', 'update', 'mat_0021', 'Anchor bolt assembly M24 10.9 — stock reduced to 3.2 ton, below the 4 ton reorder level', 'prj_0004', dt(-3, 9, 50));
  push('site-report', 'create', 'dsr_0002', 'Daily Site Report filed — Ch. 6+500 utility corridor, Al Aqiq', 'prj_0002', dt(-1, 16, 20));
  push('project', 'update', 'prj_0009', 'Project cancelled — client re-tender of Madinah Ring Road Section 4', 'prj_0009', dt(-40, 12, 0));
  push('site-report', 'create', 'dsr_0005', 'Daily Site Report filed — Basement raft, Hittin', 'prj_0008', dt(-1, 16, 25));
  push('project', 'update', 'prj_0005', 'Project placed On Hold — SEC protection-coordination study outstanding', 'prj_0005', dt(-9, 10, 15));
  push('site-report', 'create', 'dsr_0008', 'Secured stoppage audit report filed — Jubail substation', 'prj_0005', dt(-8, 12, 30));
  push('task', 'create', 'tsk_0026', 'Task created — Design review, Rev D IFC issue', 'prj_0006', dt(-18, 10, 0));
  push('settings', 'update', 'set_1', 'Report footer updated', null, dt(-24, 14, 0));
  push('document', 'create', 'doc_0007', 'Document uploaded — As-Built IFC Dossier Rev C (214 sheets)', 'prj_0003', dt(-28, 11, 30));
  push('project', 'update', 'prj_0003', 'Project completed — practical certificate issued by NWSC', 'prj_0003', dt(-28, 11, 30));
  push('site-report', 'create', 'dsr_0007', 'Daily Site Report filed — Al Amarah WTP final walkdown', 'prj_0003', dt(-30, 16, 0));
  return list.sort((a, b) => (a.at < b.at ? 1 : -1));
}

/* ------------------------------ assembly -------------------------------- */

export function buildSeed(): DBShape {
  return {
    version: 1,
    seededAt: new Date().toISOString(),
    account: buildAccount(),
    profile,
    settings,
    projects,
    tasks,
    siteReports,
    materials,
    expenses,
    documents,
    activity: buildActivity(),
  };
}
