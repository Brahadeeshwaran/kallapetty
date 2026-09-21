import ExcelJS from 'exceljs';

export interface ColumnDefinition {
  header: string;
  key: string;
  width?: number;
  hidden?: boolean;
  dropdownOptions?: string[];
}

export const parseExcelBuffer = async <T = any>(buffer: Buffer): Promise<T[]> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const data: any[] = [];
  let headers: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      // Read headers
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        headers[colNumber] = cell.value?.toString().trim() || `col${colNumber}`;
      });
    } else {
      // Read row data
      const rowData: any = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (headers[colNumber]) {
          rowData[headers[colNumber]] = cell.value;
        }
      });
      // Ignore completely empty rows
      if (Object.keys(rowData).length > 0) {
        data.push(rowData);
      }
    }
  });

  return data;
};

export const generateStyledExcelBuffer = async (
  data: any[],
  columns: ColumnDefinition[],
  sheetName: string = 'Template'
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.columns = columns.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width || 20,
    hidden: col.hidden
  }));

  // Add data if present
  if (data && data.length > 0) {
    worksheet.addRows(data);
  } else {
    // Add an empty dummy row to guide user
    const dummyRow: any = {};
    columns.forEach(c => { dummyRow[c.key] = ''; });
    worksheet.addRow(dummyRow);
  }

  // Style the header row - only for defined columns
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    if (colNumber <= columns.length) {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; // White font
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1A1A1A' }, // Dark/Black color for headers
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    }
  });

  // Add borders to all cells
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  // Apply Data Validation (Dropdowns) up to 1000 rows for templates
  columns.forEach((col, index) => {
    if (col.dropdownOptions) {
      const optionsList = `"${col.dropdownOptions.join(',')}"`;
      for (let i = 2; i <= 1000; i++) {
        worksheet.getCell(i, index + 1).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [optionsList]
        };
      }
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};
