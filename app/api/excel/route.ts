import { parseForm } from "@/utils/parseForm";
import { NextApiRequest, NextApiResponse } from "next";
import { Readable } from "stream";
import cheerio from "cheerio";
import fs from "fs";
import * as axios from "axios";
import xlsx from "xlsx-stream";

export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = [
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

function isValidURL(s: string): boolean {
  const urlPattern = new RegExp(
    "^(https?:\\/\\/)?" + // protocol
      "((([a-zA-Z\\d]([a-zA-Z\\d-]*[a-zA-Z\\d])*)\\.)+[a-zA-Z]{2,}|" + // domain name
      "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
      "(\\:\\d+)?(\\/[-a-zA-Z\\d%_.~+]*)*" + // port and path
      "(\\?[;&a-zA-Z\\d%_.~+=-]*)?" + // query string
      "(\\#[-a-zA-Z\\d_]*)?$",
    "i"
  ); // fragment locator
  return !!urlPattern.test(s);
}

async function fetchHTML(url: string): Promise<string | null> {
  if (!isValidURL(url)) {
    return null;
  }

  try {
    const response = await axios.get(url, {
      timeout: 5000, // 设置 5 秒超时
      responseType: "text", // 获取响应内容为文本
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
      },
    });

    if (response.status !== 200) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.data;
  } catch (error: any) {
    console.error(`Failed to fetch URL: ${url}`, error.message);
    return null;
  }
}

function getTextFromHTML(htmlString: string) {
  if (!htmlString) {
    return ""; // 如果 HTML 字符串为空，返回空字符串
  }

  const $ = cheerio.load(htmlString);

  // 移除不需要的标签
  $(
    "script, nav, iframe, img, .head-container, .column.left, #right-side-bar"
  ).remove();

  // 获取页面内的所有文本
  const text = $("body").text();

  // 去除多余的空白字符
  return text.trim().replace(/\s+/g, " ");
}

export async function POST(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { fields, files } = await parseForm(req);

    const excelFile = Array.isArray(files.excelFile)
      ? files.excelFile[0]
      : files.excelFile;

    if (!excelFile) {
      return res.status(400).json({ error: "请选择Excel文件" });
    }

    // 校验文件大小和类型
    if (excelFile.size > MAX_FILE_SIZE) {
      return res.status(400).json({ error: "文件大小不能超过 5MB" });
    }
    if (!ALLOWED_FILE_TYPES.includes(excelFile.type)) {
      return res.status(400).json({ error: "文件类型错误，请选择Excel文件" });
    }

    const readStream = fs.createReadStream(excelFile.filepath);
    const buffers: Buffer[] = [];
    const writeStream = new Readable({
      read() {
        // 将缓冲区中的数据提供给读取流
        if (buffers.length > 0) {
          this.push(buffers.shift());
        } else {
          this.push(null); // 数据读取完毕
        }
      },
    });

    const workbook = new xlsx.Workbook(writeStream, { bookType: "xlsx" });
    const worksheet = workbook.addWorksheet("Sheet1");
    worksheet.addRow(["url", "content"]);

    const workSheetReader = xlsx.readWorksheet(readStream, {
      sheet: 1,
    });

    for await (const row of workSheetReader) {
      const url = row[1]?.v; // 获取第二列的url
      const html = await fetchHTML(url);
      const text = html
        ? getTextFromHTML(html)
        : "Failed to fetch content or invalid URL";
      worksheet.addRow([url, text]);
    }

    await workbook.commit();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${excelFile.originalFilename}_processed.xlsx`
    );

    // 将数据写入缓冲区
    writeStream.on("data", (chunk) => {
      buffers.push(chunk);
    });

    // 数据写入完毕后，关闭响应
    writeStream.on("end", () => {
      res.end();
    });
  } catch (error) {
    console.error("上传失败：", error);
    res.status(500).json({ error: "上传失败" });
  }
}
