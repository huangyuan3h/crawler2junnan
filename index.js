const xlsx = require("xlsx");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const directoryPath = __dirname;

function isValidURL(string) {
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

function columnToLetter(column) {
  let temp,
    letter = "";
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}

const fetchHTML = async (row) => {
  const url = row[2]; // 假设URL在第三列
  if (!isValidURL(url)) {
    return null;
  }

  try {
    const response = await axios.get(url, { timeout: 5000 }); // 设置5秒超时
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch URL: ${url}`, error.message);
    return null; // 如果获取失败，返回 null
  }
};

function getTextFromHTML(htmlString) {
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

const process = async (fileName) => {
  const workbook = xlsx.readFile(fileName);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const lines = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  // Calculate the next available column (after the last column with data)
  const lastColumn = xlsx.utils.decode_range(sheet["!ref"]).e.c; // Get the index of the last column
  const nextColumnLetter = columnToLetter(lastColumn + 1); // Convert to letter

  for (let i = 0; i < lines.length; i++) {
    const html = await fetchHTML(lines[i]);

    if (html) {
      const text = getTextFromHTML(html);
      console.log(`Row ${i}:`, text);
      const cellAddress = `${nextColumnLetter}${i + 1}`; // Use calculated column letter
      sheet[cellAddress] = { t: "s", v: text };
    } else if (i === 0) {
      const cellAddress = `${nextColumnLetter}${i + 1}`; // Use calculated column letter
      sheet[cellAddress] = { t: "s", v: "url content" };
    } else {
      console.log(`Row ${i}: Failed to fetch content or invalid URL`);
      const cellAddress = `${nextColumnLetter}${i + 1}`; // Use calculated column letter
      sheet[cellAddress] = { t: "s", v: "Failed to fetch content" };
    }
  }
  xlsx.writeFile(workbook, `output_${fileName}`);
};

fs.readdir(directoryPath, (err, files) => {
  if (err) {
    return console.error("Unable to scan directory:", err);
  }

  const xlsxFiles = files.filter((file) => path.extname(file) === ".xlsx");

  if (xlsxFiles.length > 0) {
    console.log("Found the following .xlsx files:");
    console.log(xlsxFiles);
    xlsxFiles.forEach((file) => process(file));
  } else {
    console.log("No .xlsx files found in the directory.");
  }
});
