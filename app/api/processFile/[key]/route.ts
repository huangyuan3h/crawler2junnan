import { extractLastPart } from "@/utils/lastPart";

import AWS from "aws-sdk";
import * as XLSX from "xlsx";
import * as cheerio from "cheerio";

interface ProcessData {
  [key: string]: any; // 你的数据结构
}

const MAX_CELL_LENGTH = 32766;

function isValidURL(string: string): boolean {
  const urlPattern = new RegExp(
    "^(https?:\\/\\/)?" + // protocol
      "((([a-zA-Z\\d]([a-zA-Z\\d-]*[a-zA-Z\\d])*)\\.)+[a-zA-Z]{2,}|" + // domain name
      "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
      "(\\:\\d+)?(\\/[-a-zA-Z\\d%_.~+]*)*" + // port and path
      "(\\?[;&a-zA-Z\\d%_.~+=-]*)?" + // query string
      "(\\#[-a-zA-Z\\d_]*)?$",
    "i"
  ); // fragment locator
  return !!urlPattern.test(string);
}

function columnToLetter(column: number): string {
  let temp: number,
    letter = "";
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}

async function fetchHTML(url: string): Promise<string | null> {
  if (!isValidURL(url)) {
    return null;
  }

  try {
    const response = await fetchWithTimeout(url, {}, 5000); // 设置5秒超时
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  } catch (error: any) {
    console.error(`Failed to fetch URL: ${url}`, error.message);
    return null; // 如果获取失败，返回 null
  }
}

function getTextFromHTML(htmlString: string | null): string {
  if (!htmlString) {
    return ""; // 如果 HTML 字符串为空，返回空字符串
  }

  const $ = cheerio.load(htmlString);

  // 移除不需要的标签
  $("script").remove();
  $("nav").remove();
  $("iframe").remove();
  $("img").remove();
  $(".head-container").remove();
  $(".column.left").remove();
  $("#right-side-bar").remove();

  // 获取页面内的所有文本
  const text = $("body").text();

  // 去除多余的空白字符
  return text.trim().replace(/\s+/g, " ");
}

async function fetchWithTimeout(
  url: string,
  options: any = {},
  timeout: number = 5000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  options.signal = controller.signal;

  try {
    const response = await fetch(url, options);
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error(`Request to ${url} timed out after ${timeout}ms`);
    } else {
      console.error(`Request to ${url} failed:`, error.message);
    }
    throw error;
  }
}

// Initialize the S3 client
const s3 = new AWS.S3();

// Function to retrieve the Excel file from S3
async function getFileFromS3(bucketName: string, key: string): Promise<Buffer> {
  const params = {
    Bucket: bucketName,
    Key: key,
  };
  const data = await s3.getObject(params).promise();

  if (!data.Body || !Buffer.isBuffer(data.Body)) {
    throw new Error("Failed to retrieve valid buffer from S3");
  }

  return data.Body as Buffer;
}

// Function to parse the Excel file
function parseExcelFile(fileBuffer: Buffer): {
  data: ProcessData[];
  worksheet: any;
} {
  // 确保传入的 fileBuffer 是一个 Buffer
  if (!Buffer.isBuffer(fileBuffer)) {
    throw new Error("Invalid file buffer provided");
  }

  // 使用 XLSX.read 读取 Excel 文件
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error("Worksheet is undefined or invalid");
  }

  const data: ProcessData[] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
  });
  return { data, worksheet };
}

function getLastColumnIndex(worksheet: XLSX.WorkSheet): number {
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "");
  return range.e.c; // 获取最后一列的索引（从0开始）
}

// Placeholder for your data processing logic
async function processData(
  data: ProcessData[],
  lastColumnIndex: number
): Promise<ProcessData[]> {
  const nextColumnLetter = columnToLetter(lastColumnIndex + 1); // 获取下一列的字母编号

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const url = row[2]; // 假设URL在第三列

    if (i === 0) {
      // 在表头添加新列名
      row[nextColumnLetter] = "url content";
      continue;
    }

    const html = await fetchHTML(url);
    if (html) {
      let text = getTextFromHTML(html);
      // Check if the text exceeds the maximum allowed length
      if (text.length > MAX_CELL_LENGTH) {
        text = text.substring(0, MAX_CELL_LENGTH);
        console.warn(
          `Row ${i}: Text truncated to fit within Excel cell limit.`
        );
      }

      console.log(`Row ${i}:`, text);
      row[nextColumnLetter] = text;
    } else {
      console.log(`Row ${i}: Failed to fetch content or invalid URL`);
      row[nextColumnLetter] = "Failed to fetch content";
    }
  }

  return data;
}

// Function to generate a new Excel file from processed data
function generateExcelFile(data: ProcessData[]): Buffer {
  const newWorksheet = XLSX.utils.json_to_sheet(data);
  const newWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, "ProcessedData");
  return XLSX.write(newWorkbook, { bookType: "xlsx", type: "buffer" });
}

// Function to upload the processed Excel file back to S3
async function uploadFileToS3(
  bucketName: string,
  key: string,
  fileBuffer: Buffer
): Promise<void> {
  const params = {
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ContentDisposition: `attachment; filename=${key}_processed.xlsx`,
    ACL: "public-read",
  };
  await s3.putObject(params).promise();
}

export async function GET(request: Request) {
  const url = request.url;
  const key = extractLastPart(url);

  const fileBuffer = await getFileFromS3(
    process.env.NEXT_PUBLIC_EXCEL_BUCKET ?? "",
    key
  );

  // Step 2: Parse the Excel file
  const { data, worksheet } = parseExcelFile(fileBuffer);

  // Step 3: Process the data (you'll implement this)

  const num = getLastColumnIndex(worksheet);
  const processedData = await processData(data, num);

  // Step 4: Generate the processed Excel file
  const processedFileBuffer = generateExcelFile(processedData);

  // Step 5: Upload the processed file back to S3
  await uploadFileToS3(
    process.env.NEXT_PUBLIC_EXCEL_BUCKET ?? "",
    key,
    processedFileBuffer
  );

  return Response.json({ url: key });
}
