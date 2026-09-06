import type { ThemeMode, ThemeOption } from '../../stores/ui'
import { THEME_PRESETS } from '../../stores/ui'

export type { ThemeMode, ThemeOption }
export { THEME_PRESETS }

export interface ExportThemeVariables {
  '--canvas-bg': string
  '--bg-paper': string
  '--bg-shell': string
  '--bg-panel': string
  '--text-main': string
  '--text-sub': string
  '--text-soft': string
  '--tree-line-color': string
  '--card-panel-fill': string
  '--card-panel-stroke': string
  '--card-name-fill': string
  '--card-status-fill': string
  '--card-detail-fill': string
  '--card-inner-stroke': string
  '--card-header-fill': string
  '--card-hover-fill': string
  '--card-hover-stroke': string
  '--card-selected-stroke': string
  '--card-male-header': string
  '--card-female-header': string
  '--accent-signal': string
  '--color-accent': string
  '--color-neutral-1': string
  '--color-neutral-2': string
  '--color-neutral-3': string
  '--color-neutral-4': string
  '--color-neutral-5': string
  '--color-neutral-6': string
  '--color-neutral-7': string
  '--color-neutral-8': string
  '--color-neutral-9': string
  '--color-neutral-10': string
  '--color-male': string
  '--color-male-muted': string
  '--color-female': string
  '--color-female-muted': string
  '--color-alive': string
  '--color-deceased': string
  '--border-color': string
  '--line-soft': string
  '--color-card-stroke': string
}

export const EXPORT_THEME_VARIABLES: Record<ThemeMode, ExportThemeVariables> = {
  paper: {
    '--canvas-bg': '#FAF9F6',
    '--bg-paper': '#FAF9F6',
    '--bg-shell': '#FAF9F6',
    '--bg-panel': '#F3F1EB',
    '--text-main': '#1C1A17',
    '--text-sub': '#6B6252',
    '--text-soft': '#8C8473',
    '--tree-line-color': '#000000',
    '--card-panel-fill': '#F3F1EB',
    '--card-panel-stroke': 'rgba(28, 27, 24, 0.08)',
    '--card-name-fill': '#0E0D0B',
    '--card-status-fill': '#6B6252',
    '--card-detail-fill': '#463E32',
    '--card-inner-stroke': '#E6E2D8',
    '--card-header-fill': '#E6E2D8',
    '--card-hover-fill': '#FAF9F6',
    '--card-hover-stroke': '#B0A99A',
    '--card-selected-stroke': '#C63C2E',
    '--card-male-header': 'rgba(46, 92, 138, 0.08)',
    '--card-female-header': 'rgba(181, 61, 88, 0.08)',
    '--accent-signal': '#C63C2E',
    '--color-accent': '#C63C2E',
    '--color-neutral-1': '#FAF9F6',
    '--color-neutral-2': '#F3F1EB',
    '--color-neutral-3': '#E6E2D8',
    '--color-neutral-4': '#D5CFC2',
    '--color-neutral-5': '#B0A99A',
    '--color-neutral-6': '#8C8473',
    '--color-neutral-7': '#6B6252',
    '--color-neutral-8': '#463E32',
    '--color-neutral-9': '#1C1A17',
    '--color-neutral-10': '#0E0D0B',
    '--color-male': '#2E5C8A',
    '--color-male-muted': 'rgba(46, 92, 138, 0.08)',
    '--color-female': '#B53D58',
    '--color-female-muted': 'rgba(181, 61, 88, 0.08)',
    '--color-alive': '#3D7F5E',
    '--color-deceased': '#8C8473',
    '--border-color': '#D5CFC2',
    '--line-soft': '#D5CFC2',
    '--color-card-stroke': 'rgba(28, 27, 24, 0.08)',
  },
  slate: {
    '--canvas-bg': '#F5F7FA',
    '--bg-paper': '#F5F7FA',
    '--bg-shell': '#F5F7FA',
    '--bg-panel': '#FFFFFF',
    '--text-main': '#252D3A',
    '--text-sub': '#526174',
    '--text-soft': '#606D7E',
    '--tree-line-color': '#000000',
    '--card-panel-fill': '#FFFFFF',
    '--card-panel-stroke': '#DDE3EB',
    '--card-name-fill': '#192231',
    '--card-status-fill': '#526174',
    '--card-detail-fill': '#3C4B60',
    '--card-inner-stroke': '#DDE3EB',
    '--card-header-fill': '#EDF1F6',
    '--card-hover-fill': '#EDF1F6',
    '--card-hover-stroke': '#B7C2D0',
    '--card-selected-stroke': '#405E85',
    '--card-male-header': 'rgba(46, 92, 138, 0.08)',
    '--card-female-header': 'rgba(181, 61, 88, 0.08)',
    '--accent-signal': '#405E85',
    '--color-accent': '#405E85',
    '--color-neutral-1': '#F5F7FA',
    '--color-neutral-2': '#FFFFFF',
    '--color-neutral-3': '#EDF1F6',
    '--color-neutral-4': '#DDE3EB',
    '--color-neutral-5': '#B7C2D0',
    '--color-neutral-6': '#606D7E',
    '--color-neutral-7': '#526174',
    '--color-neutral-8': '#3C4B60',
    '--color-neutral-9': '#252D3A',
    '--color-neutral-10': '#192231',
    '--color-male': '#2E5C8A',
    '--color-male-muted': 'rgba(46, 92, 138, 0.08)',
    '--color-female': '#B53D58',
    '--color-female-muted': 'rgba(181, 61, 88, 0.08)',
    '--color-alive': '#3D7F5E',
    '--color-deceased': '#606D7E',
    '--border-color': '#DDE3EB',
    '--line-soft': '#DDE3EB',
    '--color-card-stroke': '#DDE3EB',
  },
  pure: {
    '--canvas-bg': '#F8F9FA',
    '--bg-paper': '#F8F9FA',
    '--bg-shell': '#F8F9FA',
    '--bg-panel': '#FFFFFF',
    '--text-main': '#1F2327',
    '--text-sub': '#4C535A',
    '--text-soft': '#646B73',
    '--tree-line-color': '#000000',
    '--card-panel-fill': '#FFFFFF',
    '--card-panel-stroke': '#E2E5E8',
    '--card-name-fill': '#121518',
    '--card-status-fill': '#4C535A',
    '--card-detail-fill': '#32383E',
    '--card-inner-stroke': '#E2E5E8',
    '--card-header-fill': '#EFF1F3',
    '--card-hover-fill': '#EFF1F3',
    '--card-hover-stroke': '#B6BCC2',
    '--card-selected-stroke': '#2C3238',
    '--card-male-header': 'rgba(46, 92, 138, 0.08)',
    '--card-female-header': 'rgba(181, 61, 88, 0.08)',
    '--accent-signal': '#2C3238',
    '--color-accent': '#2C3238',
    '--color-neutral-1': '#F8F9FA',
    '--color-neutral-2': '#FFFFFF',
    '--color-neutral-3': '#EFF1F3',
    '--color-neutral-4': '#E2E5E8',
    '--color-neutral-5': '#B6BCC2',
    '--color-neutral-6': '#646B73',
    '--color-neutral-7': '#4C535A',
    '--color-neutral-8': '#32383E',
    '--color-neutral-9': '#1F2327',
    '--color-neutral-10': '#121518',
    '--color-male': '#2E5C8A',
    '--color-male-muted': 'rgba(46, 92, 138, 0.08)',
    '--color-female': '#B53D58',
    '--color-female-muted': 'rgba(181, 61, 88, 0.08)',
    '--color-alive': '#3D7F5E',
    '--color-deceased': '#646B73',
    '--border-color': '#E2E5E8',
    '--line-soft': '#E2E5E8',
    '--color-card-stroke': '#E2E5E8',
  },
  pine: {
    '--canvas-bg': '#F6F7F3',
    '--bg-paper': '#F6F7F3',
    '--bg-shell': '#F6F7F3',
    '--bg-panel': '#FFFFFF',
    '--text-main': '#26332D',
    '--text-sub': '#536254',
    '--text-soft': '#616E62',
    '--tree-line-color': '#000000',
    '--card-panel-fill': '#FFFFFF',
    '--card-panel-stroke': '#DEE5DC',
    '--card-name-fill': '#1B2821',
    '--card-status-fill': '#536254',
    '--card-detail-fill': '#3E5144',
    '--card-inner-stroke': '#DEE5DC',
    '--card-header-fill': '#EDF1EB',
    '--card-hover-fill': '#EDF1EB',
    '--card-hover-stroke': '#B8C4B7',
    '--card-selected-stroke': '#356451',
    '--card-male-header': 'rgba(46, 92, 138, 0.08)',
    '--card-female-header': 'rgba(181, 61, 88, 0.08)',
    '--accent-signal': '#356451',
    '--color-accent': '#356451',
    '--color-neutral-1': '#F6F7F3',
    '--color-neutral-2': '#FFFFFF',
    '--color-neutral-3': '#EDF1EB',
    '--color-neutral-4': '#DEE5DC',
    '--color-neutral-5': '#B8C4B7',
    '--color-neutral-6': '#616E62',
    '--color-neutral-7': '#536254',
    '--color-neutral-8': '#3E5144',
    '--color-neutral-9': '#26332D',
    '--color-neutral-10': '#1B2821',
    '--color-male': '#2E5C8A',
    '--color-male-muted': 'rgba(46, 92, 138, 0.08)',
    '--color-female': '#B53D58',
    '--color-female-muted': 'rgba(181, 61, 88, 0.08)',
    '--color-alive': '#3D7F5E',
    '--color-deceased': '#616E62',
    '--border-color': '#DEE5DC',
    '--line-soft': '#DEE5DC',
    '--color-card-stroke': '#DEE5DC',
  },
  dark: {
    '--canvas-bg': '#0C0C0B',
    '--bg-paper': '#161513',
    '--bg-shell': '#0C0C0B',
    '--bg-panel': '#161513',
    '--text-main': '#E3E1DB',
    '--text-sub': '#A3A19D',
    '--text-soft': '#807E7A',
    '--tree-line-color': 'rgba(128, 126, 122, 0.55)',
    '--card-panel-fill': '#161513',
    '--card-panel-stroke': 'rgba(255, 255, 255, 0.07)',
    '--card-name-fill': '#FFFFFF',
    '--card-status-fill': '#A3A19D',
    '--card-detail-fill': '#C4C2BE',
    '--card-inner-stroke': 'rgba(255, 255, 255, 0.06)',
    '--card-header-fill': '#242220',
    '--card-hover-fill': '#242220',
    '--card-hover-stroke': 'rgba(255, 255, 255, 0.16)',
    '--card-selected-stroke': '#437EEB',
    '--card-male-header': 'rgba(87, 139, 191, 0.15)',
    '--card-female-header': 'rgba(220, 108, 133, 0.12)',
    '--accent-signal': '#437EEB',
    '--color-accent': '#437EEB',
    '--color-neutral-1': '#0C0C0B',
    '--color-neutral-2': '#161513',
    '--color-neutral-3': '#242220',
    '--color-neutral-4': '#383633',
    '--color-neutral-5': '#54524F',
    '--color-neutral-6': '#807E7A',
    '--color-neutral-7': '#A3A19D',
    '--color-neutral-8': '#C4C2BE',
    '--color-neutral-9': '#E3E1DB',
    '--color-neutral-10': '#F3F2EE',
    '--color-male': '#578BBF',
    '--color-male-muted': 'rgba(87, 139, 191, 0.15)',
    '--color-female': '#DC6C85',
    '--color-female-muted': 'rgba(220, 108, 133, 0.12)',
    '--color-alive': '#63B287',
    '--color-deceased': '#807E7A',
    '--border-color': 'rgba(255, 255, 255, 0.07)',
    '--line-soft': 'rgba(255, 255, 255, 0.07)',
    '--color-card-stroke': 'rgba(255, 255, 255, 0.07)',
  },
}

export function getThemeCssVariables(theme: ThemeMode = 'paper'): Record<string, string> {
  const base = { ...EXPORT_THEME_VARIABLES[theme] }
  if (typeof window !== 'undefined' && document.documentElement.getAttribute('data-theme') === theme) {
    const computed = getComputedStyle(document.documentElement)
    for (const key of Object.keys(base) as (keyof ExportThemeVariables)[]) {
      const val = computed.getPropertyValue(key).trim()
      if (val) {
        base[key] = val
      }
    }
  }
  return base
}

export function buildExportThemeCss(targetTheme: ThemeMode = 'paper'): string {
  const vars = getThemeCssVariables(targetTheme)
  let css = `:root, svg, [data-theme="${targetTheme}"] {\n`
  for (const [key, val] of Object.entries(vars)) {
    css += `  ${key}: ${val};\n`
  }
  css += '}\n'

  if (targetTheme === 'dark') {
    css += `
[data-theme="dark"] .person-card .person-card__name,
[data-theme="dark"] .person-card .person-card__name--compact,
[data-theme="dark"] .person-card--hovered .person-card__name,
[data-theme="dark"] .person-card--hovered .person-card__name--compact,
[data-theme="dark"] .person-card:hover .person-card__name--compact,
[data-theme="dark"] .person-card--selected .person-card__name--compact {
  fill: #FFFFFF !important;
}
[data-theme="dark"] .tree-lines path {
  stroke: rgba(128, 126, 122, 0.55);
}
[data-theme="dark"] .person-card__drop-line {
  stroke: rgba(255, 255, 255, 0.12);
}
`
  }

  return css
}

export function buildAllExportThemesCss(): string {
  let css = ''
  for (const preset of THEME_PRESETS) {
    const vars = EXPORT_THEME_VARIABLES[preset.id]
    const selector = preset.id === 'paper' ? `:root, [data-theme="paper"]` : `[data-theme="${preset.id}"]`
    css += `${selector} {\n`
    for (const [key, val] of Object.entries(vars)) {
      css += `  ${key}: ${val};\n`
    }
    css += '}\n'
  }

  css += `
[data-theme="dark"] .person-card .person-card__name,
[data-theme="dark"] .person-card .person-card__name--compact,
[data-theme="dark"] .person-card--hovered .person-card__name,
[data-theme="dark"] .person-card--hovered .person-card__name--compact,
[data-theme="dark"] .person-card:hover .person-card__name--compact,
[data-theme="dark"] .person-card--selected .person-card__name--compact {
  fill: #FFFFFF !important;
}
[data-theme="dark"] .tree-lines path {
  stroke: rgba(128, 126, 122, 0.55);
}
[data-theme="dark"] .person-card__drop-line {
  stroke: rgba(255, 255, 255, 0.12);
}
`
  return css
}