/* ==========================================================================
   ICON SET
   Hand-drawn 24×24 grid, 1.6 px stroke, square caps. No icon dependency —
   every glyph is a real path so line weights stay identical app-wide.
   ========================================================================== */

'use client';

import type { SVGProps } from 'react';

export type IconName =
  | 'dashboard'
  | 'building'
  | 'tasks'
  | 'clipboard'
  | 'inventory'
  | 'calculator'
  | 'wallet'
  | 'folder'
  | 'report'
  | 'user'
  | 'settings'
  | 'search'
  | 'plus'
  | 'minus'
  | 'close'
  | 'check'
  | 'chevron-down'
  | 'chevron-up'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevrons-left'
  | 'chevrons-right'
  | 'arrow-up'
  | 'arrow-down'
  | 'arrow-right'
  | 'arrow-left'
  | 'edit'
  | 'trash'
  | 'download'
  | 'upload'
  | 'print'
  | 'refresh'
  | 'filter'
  | 'sort'
  | 'sort-asc'
  | 'sort-desc'
  | 'more'
  | 'more-vert'
  | 'bell'
  | 'bell-off'
  | 'sun'
  | 'moon'
  | 'monitor'
  | 'globe'
  | 'logout'
  | 'lock'
  | 'unlock'
  | 'eye'
  | 'eye-off'
  | 'alert'
  | 'info'
  | 'help'
  | 'warning'
  | 'star'
  | 'clock'
  | 'calendar'
  | 'map-pin'
  | 'users'
  | 'user-plus'
  | 'truck'
  | 'hard-hat'
  | 'ruler'
  | 'compass'
  | 'layers'
  | 'cube'
  | 'square'
  | 'percent'
  | 'swap'
  | 'weight'
  | 'estimate'
  | 'excavate'
  | 'concrete'
  | 'file'
  | 'file-pdf'
  | 'file-image'
  | 'file-sheet'
  | 'file-zip'
  | 'image'
  | 'cloud-upload'
  | 'grid'
  | 'list'
  | 'external'
  | 'copy'
  | 'link'
  | 'menu'
  | 'panel-left'
  | 'trending-up'
  | 'trending-down'
  | 'activity'
  | 'award'
  | 'briefcase'
  | 'mail'
  | 'phone'
  | 'shield'
  | 'database'
  | 'save'
  | 'log-out'
  | 'circle-dot'
  | 'sliders'
  | 'target'
  | 'sunrise'
  | 'wind'
  | 'thermometer'
  | 'camera'
  | 'box'
  | 'gauge'
  | 'scale'
  | 'fuel'
  | 'tool'
  | 'landmark';

const P: Record<IconName, string> = {
  dashboard: 'M3 3h7v8H3zM14 3h7v5h-7zM14 11h7v10h-7zM3 14h7v7H3z',
  building: 'M3 21h18M5 21V6l7-3 7 3v15M9 21v-4h6v4M9 9h.01M15 9h.01M9 13h.01M15 13h.01',
  tasks: 'M9 5h11M9 12h11M9 19h11M4 5l1.4 1.4L8 3.6M4 12l1.4 1.4L8 10.6M4 19l1.4 1.4L8 17.6',
  clipboard:
    'M9 3h6v3H9zM8 4.5H6a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5.5a1 1 0 0 0-1-1h-2M8 10h8M8 14h8M8 17h5',
  inventory:
    'M3 7.5 12 3l9 4.5v9L12 21l-9-4.5zM3 7.5 12 12l9-4.5M12 12v9M7.5 5.2l9 4.6',
  calculator:
    'M6 2h12a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM8 6h8v3H8zM8.5 12.5h.01M12 12.5h.01M15.5 12.5h.01M8.5 16h.01M12 16h.01M15.5 16h.01M8.5 19h.01M12 19h.01M15.5 19h.01',
  wallet: 'M3 7a1 1 0 0 1 1-1h12v3M3 7v12a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H4M17 13.5h.01',
  folder: 'M3 6.5A1.5 1.5 0 0 1 4.5 5h4L11 8h8.5A1.5 1.5 0 0 1 21 9.5V18a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18z',
  report:
    'M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7zM14 3v4h4M9 12h6M9 16h6M9 8h2',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M4.5 12.5l5 5 10-11',
  'chevron-down': 'M6 9.5l6 6 6-6',
  'chevron-up': 'M6 14.5l6-6 6 6',
  'chevron-left': 'M14.5 5l-7 7 7 7',
  'chevron-right': 'M9.5 5l7 7-7 7',
  'chevrons-left': 'M11 5l-7 7 7 7M20 5l-7 7 7 7',
  'chevrons-right': 'M13 5l7 7-7 7M4 5l7 7-7 7',
  'arrow-up': 'M12 20V4M5 11l7-7 7 7',
  'arrow-down': 'M12 4v16M5 13l7 7 7-7',
  'arrow-right': 'M4 12h16M13 5l7 7-7 7',
  'arrow-left': 'M20 12H4M11 5l-7 7 7 7',
  edit: 'M4 20h4L20 8l-4-4L4 16zM14.5 5.5l4 4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  download: 'M12 3v13M6.5 11.5L12 17l5.5-5.5M4 21h16',
  upload: 'M12 17V4M6.5 9.5L12 4l5.5 5.5M4 21h16',
  print:
    'M7 8V3h10v5M7 18H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M7 14h10v7H7zM17 11h.01',
  refresh: 'M20 12a8 8 0 1 1-2.6-5.9M20 4v5h-5',
  filter: 'M3 5h18l-7 8v6l-4 2v-8z',
  sort: 'M7 4v16M7 20l-3-3M7 4l3 3M17 20V4M17 4l3 3M17 20l-3-3',
  'sort-asc': 'M12 5v14M12 19l-4-4M12 19l4-4M7 4h10',
  'sort-desc': 'M12 19V5M12 5L8 9M12 5l4 4M7 20h10',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
  'more-vert': 'M12 6h.01M12 12h.01M12 18h.01',
  bell: 'M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6M10.3 20a2 2 0 0 0 3.4 0',
  'bell-off':
    'M18 9a6 6 0 0 0-8.6-5.4M5.9 6.9A6 6 0 0 0 6 9c0 5-2 6-2 6h13M10.3 20a2 2 0 0 0 3.4 0M3 3l18 18',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z',
  monitor: 'M3 4.5h18a.5.5 0 0 1 .5.5v10a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5zM8 20h8M12 15.5V20',
  globe:
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3.5 9h17M3.5 15h17M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z',
  logout: 'M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4M16 17l5-5-5-5M21 12H9',
  lock: 'M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM7.5 11V7a4.5 4.5 0 0 1 9 0v4M12 15.5v2',
  unlock: 'M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM7.5 11V7a4.5 4.5 0 0 1 8.7-1.4M12 15.5v2',
  eye: 'M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12zM12 14.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2z',
  'eye-off':
    'M4 4l16 16M9.9 5.8A9.9 9.9 0 0 1 12 5.5c6.2 0 10 6.5 10 6.5a17 17 0 0 1-3 3.8M6.5 7.8A17 17 0 0 0 2 12s3.8 6.5 10 6.5c1.2 0 2.3-.2 3.3-.6M9.9 9.9a2.6 2.6 0 0 0 3.6 3.7',
  alert: 'M12 3.5 22 20H2zM12 10v4M12 17h.01',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.5v.7M12 17h.01',
  warning:
    'M10.3 3.9 2.4 17.4A1 1 0 0 0 3.3 19h17.4a1 1 0 0 0 .9-1.6L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 16.5h.01',
  star: 'M12 3.5l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6L3.2 9.9l6.1-.8z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5.2l3.4 2',
  calendar: 'M4 5.5h16a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1zM3 10h18M8 3v4M16 3v4',
  'map-pin': 'M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  users:
    'M9 11.5a3.8 3.8 0 1 0 0-7.6 3.8 3.8 0 0 0 0 7.6zM2.5 20a6.5 6.5 0 0 1 13 0M16.5 4.4a3.8 3.8 0 0 1 0 7.2M18 14.2a6.5 6.5 0 0 1 3.5 5.8',
  'user-plus':
    'M10 11.5a3.8 3.8 0 1 0 0-7.6 3.8 3.8 0 0 0 0 7.6zM3 20a7 7 0 0 1 11-5.7M18 14v6M15 17h6',
  truck: 'M3 6.5h10v10H3zM13 10h4l3 3.2v3.3h-7zM7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  'hard-hat':
    'M4 17a8 8 0 0 1 16 0M9.5 4.5h5v3h-5zM4 17h16v2H4zM12 4.5v12',
  ruler: 'M14.6 2.9 21.1 9.4 9.4 21.1 2.9 14.6zM7 10.5l1.6 1.6M10 7.5l1.6 1.6M13 4.5l1.6 1.6M4 13.5l1.6 1.6',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15.5 8.5l-2 5-5 2 2-5z',
  layers: 'M12 3 3 7.5l9 4.5 9-4.5zM3 12.5 12 17l9-4.5M3 17 12 21.5 21 17',
  cube: 'M12 2.5 21 7v10l-9 4.5L3 17V7zM3 7l9 4.5L21 7M12 11.5V21.5',
  square: 'M4 4h16v16H4z',
  percent: 'M19 5 5 19M7.5 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  swap: 'M4 8h13l-3.5-3.5M20 16H7l3.5 3.5',
  weight:
    'M5 8h14l1.6 12.2a1 1 0 0 1-1 1.2H4.4a1 1 0 0 1-1-1.2zM9 8a3 3 0 1 1 6 0M12 12.5v3',
  estimate:
    'M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h7M9 8h3',
  excavate:
    'M3 20h6l2.5-5.5h4L13 20h8M8 14.5 15.5 5l2.5 3.5-8 6M17 3v4',
  concrete: 'M4 20V9l8-5 8 5v11zM4 13h16M12 4v16M8 16.5v.01M16 16.5v.01',
  file: 'M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7zM14 3v4h4',
  'file-pdf': 'M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7zM14 3v4h4M8.5 17v-4h1.2a1.3 1.3 0 0 1 0 2.6H8.5M12.5 17v-4H14a2 2 0 0 1 0 4z',
  'file-image':
    'M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7zM14 3v4h4M8.5 16l2.5-3 2 2.2 1.6-1.8 2.4 2.6',
  'file-sheet':
    'M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7zM14 3v4h4M8.5 11h7M8.5 14h7M8.5 17h4',
  'file-zip':
    'M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7zM14 3v4h4M11 3v3M13 6v2.5M11 8.5v3M13 11.5V13a1 1 0 1 1-2 0M11 18h2',
  image:
    'M4 4.5h16a.5.5 0 0 1 .5.5v14a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5zM3.5 16l4.5-4.5 3.5 3.5 3-3 6 6M8.5 9a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4z',
  'cloud-upload': 'M7 18a4 4 0 0 1-.4-8A5.5 5.5 0 0 1 17 9.5h.5a3.5 3.5 0 1 1 0 7H16M12 21v-8M9 15.5l3-3 3 3',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  list: 'M4 6h16M4 12h16M4 18h16',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  copy: 'M9 9h11v11a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1zM5 15H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v1',
  link: 'M10 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7l-1.3 1.3M14 10.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 1 0 5.7 5.7l1.3-1.3',
  menu: 'M4 7h16M4 12h16M4 17h16',
  'panel-left': 'M3.5 4.5h17v15h-17zM9.5 4.5v15',
  'trending-up': 'M3 17l6-6 4 4 8-8M21 7v5M21 7h-5',
  'trending-down': 'M3 7l6 6 4-4 8 8M21 17v-5M21 17h-5',
  activity: 'M3 12h4l2.5-7 4 14 2.5-7h5',
  award:
    'M12 14.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM8.5 13.5 7 22l5-2.5L17 22l-1.5-8.5',
  briefcase:
    'M4 8h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM9 8V5h6v3M3 12.5h18M11 12.5v1.5h2v-1.5',
  mail: 'M3 6h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM2.5 7l9.5 6 9.5-6',
  phone:
    'M7 3h3l1.5 4-2 1.5a12 12 0 0 0 6 6L17 12.5l4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.2 2 2 0 0 1 6.6 3z',
  shield: 'M12 3 4.5 6v6c0 4.5 3.1 7.9 7.5 9 4.4-1.1 7.5-4.5 7.5-9V6zM9 12l2 2 4-4',
  database:
    'M12 7.5c4.7 0 8.5-1.1 8.5-2.5S16.7 2.5 12 2.5 3.5 3.6 3.5 5 7.3 7.5 12 7.5zM20.5 5v14c0 1.4-3.8 2.5-8.5 2.5S3.5 20.4 3.5 19V5M20.5 12c0 1.4-3.8 2.5-8.5 2.5S3.5 13.4 3.5 12',
  save: 'M5 3h11l3 3v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 3v6h7V3M8 14h8v7H8z',
  'log-out': 'M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l4-4-4-4M14 12H3',
  'circle-dot': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 4.5v5M7 14.5v5',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  sunrise: 'M12 3v4M5.6 6.6 7 8M18.4 6.6 17 8M2 12h3M19 12h3M7 16a5 5 0 0 1 10 0M3 20h18',
  wind: 'M3 8h11a3 3 0 1 0-3-3M3 12h14a3 3 0 1 1-3 3M3 16h8',
  thermometer: 'M10 14.8V5a2 2 0 1 1 4 0v9.8a4 4 0 1 1-4 0zM12 11v6',
  camera:
    'M3 7.5h3.5L8 5h8l1.5 2.5H21a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8.5a1 1 0 0 1 1-1zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  box: 'M3 7.5 12 3l9 4.5v9L12 21l-9-4.5zM3 7.5 12 12l9-4.5M12 12v9M7.5 5.2l9 4.6',
  gauge: 'M12 20a8 8 0 1 1 8-8M12 12l4.5-4.5M20.5 15.5 19 17M4 12h2M12 4v2M6.6 6.6 8 8',
  scale:
    'M12 4v16M6 8h12M4 20h16M8 8l-3 7h6zM16 8l-3 7h6zM9.5 4h5',
  fuel: 'M5 21V4a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v17M3 21h13M6 8h7M15 8h2.5l2.5 3v7a1.5 1.5 0 0 1-3 0v-4M19 12h-2',
  tool: 'M14.5 6.5a4 4 0 0 1 5.2 5.2l-8 8a2.8 2.8 0 0 1-4-4zM14.5 6.5 12 4a4 4 0 0 0-5.2 5.2l2.6 2.6M6 18l-2 2',
  landmark:
    'M3 10h18L12 4zM5 10v8M9 10v8M15 10v8M19 10v8M3 21h18M3 18h18',
};

/* Icons that read better as filled shapes. */
const FILL: Partial<Record<IconName, string>> = {
  star: 'M12 3.5l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6L3.2 9.9l6.1-.8z',
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  title?: string;
}

export function Icon({
  name,
  size = 18,
  strokeWidth = 1.6,
  title,
  ...rest
}: IconProps) {
  const d = P[name] ?? P['circle-dot'] ?? '';
  const filled = FILL[name];
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="ico"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <path d={filled ?? d} />
    </svg>
  );
}

/** Resolve an icon name safely (calculators declare their own glyph). */
export function iconFor(name: string, fallback: IconName = 'square'): IconName {
  return (name in P ? name : fallback) as IconName;
}

export default Icon;