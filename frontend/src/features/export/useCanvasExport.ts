// src/features/export/useCanvasExport.ts
import { toPng } from 'html-to-image';
import { createStandalonePublicationSvg, serializeSvg, type PdfExportHeader } from './publicationExport';
import type { PublicationLayout } from '../../types/family';

const PDF_POINTS_PER_CSS_PIXEL = 72 / 96;
const SVG_ROOT_TAG_PATTERN = /<svg\b[^>]*>/i;
const PDF_SERIF_FONT_STACK = "'SimSun', 'Songti SC', 'STSong', serif";
const PDF_SANS_FONT_STACK = "'Microsoft YaHei', 'PingFang SC', 'Noto Sans CJK SC', sans-serif";

export interface ExportImageOptions {
  scale: number;
  backgroundColor: string;
}

export interface CaptureSvgOptions {
  forPdf?: boolean;
  embedImages?: boolean;
  resourceBaseUrl?: string;
  exportHeader?: PdfExportHeader;
}

export interface SinglePagePdfRequest {
  svgMarkup: string;
  pdfWidth: number;
  pdfHeight: number;
  title?: string;
  prefaceText?: string;
  exportHeader?: PdfExportHeader;
}

export interface SinglePagePdfLayout {
  width: number;
  height: number;
}

function extractSvgThemeVariables(svgMarkup: string): Record<string, string> {
  const variables: Record<string, string> = {};
  for (const match of svgMarkup.matchAll(/--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)) {
    variables[`--${match[1]}`] = match[2].trim();
  }
  return variables;
}

function resolveSvgCssValue(value: string, variables: Record<string, string>): string {
  let resolved = value;

  while (resolved.includes('var(')) {
    const next = resolved.replace(/var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,\s*([^)]+))?\)/g, (_, variableName: string, fallback?: string) => {
      const variableValue = variables[variableName];
      if (variableValue) {
        return variableValue;
      }

      return fallback ? resolveSvgCssValue(fallback.trim(), variables) : '';
    });

    if (next === resolved) {
      break;
    }

    resolved = next;
  }

  return resolved;
}

function replaceSvgRootTag(svgMarkup: string, transform: (tag: string) => string): string {
  const currentTag = svgMarkup.match(SVG_ROOT_TAG_PATTERN)?.[0];
  if (!currentTag) {
    return svgMarkup;
  }

  return svgMarkup.replace(currentTag, transform(currentTag));
}

function upsertSvgRootAttribute(tag: string, attribute: string, value: string): string {
  if (new RegExp(`\\s${attribute}="[^"]*"`).test(tag)) {
    return tag.replace(new RegExp(`${attribute}="[^"]*"`), `${attribute}="${value}"`);
  }

  return tag.replace('<svg', `<svg ${attribute}="${value}"`);
}

function normalizeStandaloneSvgForPdf(svgMarkup: string): string {
  const variables = extractSvgThemeVariables(svgMarkup);

  return resolveSvgCssValue(
    svgMarkup
      .replace(/@import\s+url\([^)]*\)\s*;\s*/gi, '')
      .replace(/:root\s*\{[\s\S]*?\}\s*/gi, '')
      .replace(/background\s*:\s*[^;]+;/gi, '')
      .replace(/cursor\s*:\s*[^;]+;/gi, '')
      .replace(/user-select\s*:\s*[^;]+;/gi, '')
      .replace(/<filter\b[\s\S]*?<\/filter>/gi, '')
      .replace(/\sfilter="url\(#.+?\)"/gi, '')
      .replaceAll("'Noto Serif SC', 'Songti SC', serif", PDF_SERIF_FONT_STACK)
      .replaceAll("'Manrope', sans-serif", PDF_SANS_FONT_STACK),
    variables,
  );
}

function retargetSvgMarkupForPdf(svgMarkup: string, pdfWidth: number, pdfHeight: number): string {
  return replaceSvgRootTag(svgMarkup, (tag) => {
    let nextTag = upsertSvgRootAttribute(tag, 'width', `${pdfWidth}pt`);
    nextTag = upsertSvgRootAttribute(nextTag, 'height', `${pdfHeight}pt`);
    nextTag = upsertSvgRootAttribute(nextTag, 'preserveAspectRatio', 'xMidYMid meet');
    return nextTag;
  });
}

function extractSvgViewBoxSize(svgMarkup: string): { width: number; height: number } | null {
  const match = svgMarkup.match(/viewBox="([^"]+)"/);
  if (!match) return null;
  const parts = match[1].trim().split(/\s+/).map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return null;
  return { width: parts[2], height: parts[3] };
}

export async function captureCanvasAsBase64(elementId: string, options: ExportImageOptions): Promise<string> {
  const node = document.getElementById(elementId);
  if (!node) throw new Error(`Element ${elementId} not found`);

  return await toPng(node, {
    pixelRatio: options.scale,
    backgroundColor: options.backgroundColor === 'transparent' ? 'rgba(0,0,0,0)' : options.backgroundColor,
  });
}

export function buildSinglePagePdfRequest(input: {
  svgMarkup: string;
  layout: SinglePagePdfLayout;
  title?: string;
  prefaceText?: string;
  exportHeader?: PdfExportHeader;
}): SinglePagePdfRequest {
  const normalizedSvgMarkup = normalizeStandaloneSvgForPdf(input.svgMarkup);
  const svgSize = extractSvgViewBoxSize(normalizedSvgMarkup);
  const sourceWidth = svgSize?.width ?? input.layout.width;
  const sourceHeight = svgSize?.height ?? input.layout.height;
  const pdfWidth = Number((sourceWidth * PDF_POINTS_PER_CSS_PIXEL).toFixed(2));
  const pdfHeight = Number((sourceHeight * PDF_POINTS_PER_CSS_PIXEL).toFixed(2));

  return {
    svgMarkup: retargetSvgMarkupForPdf(normalizedSvgMarkup, pdfWidth, pdfHeight),
    pdfWidth,
    pdfHeight,
    title: input.title,
    prefaceText: input.prefaceText,
    exportHeader: input.exportHeader,
  };
}

export async function captureCanvasAsSvgMarkup(
  elementId: string,
  layout: PublicationLayout,
  title: string,
  options: CaptureSvgOptions = {},
): Promise<string> {
  console.log(`[Export] Capturing SVG for element: ${elementId}`);
  const node = document.getElementById(elementId);
  
  if (!node) {
    console.error(`[Export] Element with ID ${elementId} not found in DOM`);
    throw new Error(`Element ${elementId} not found`);
  }

  if (!(node instanceof SVGSVGElement)) {
    console.log(`[Export] Element ${elementId} is not an SVG, searching for nested SVG...`);
    const svgInNode = node.querySelector('svg');
    if (!svgInNode) {
      console.error(`[Export] No <svg> tag found inside #${elementId}`);
      throw new Error(`SVG element not found in ${elementId}`);
    }
    
    console.log(`[Export] Found nested SVG, creating standalone clone...`);
    const svg = await createStandalonePublicationSvg({
        svgElement: svgInNode as SVGSVGElement,
        layout,
        title,
        pdfFriendly: options.forPdf,
        embedImages: options.embedImages,
        resourceBaseUrl: options.resourceBaseUrl,
        exportHeader: options.exportHeader,
    });
    return serializeSvg(svg);
  }

  console.log(`[Export] Element #${elementId} is an SVG, cloning...`);
  const svg = await createStandalonePublicationSvg({
    svgElement: node as SVGSVGElement,
    layout,
    title,
    pdfFriendly: options.forPdf,
    embedImages: options.embedImages,
    resourceBaseUrl: options.resourceBaseUrl,
    exportHeader: options.exportHeader,
  });
  return serializeSvg(svg);
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
