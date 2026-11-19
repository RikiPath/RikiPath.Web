/** Stable key for an edited workbook cell (sheet, row, column). */
export function workbookEditKey(sheetName, row, column) {
  return JSON.stringify([sheetName, row, column]);
}
