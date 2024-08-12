import formidable, { Fields, Files } from "formidable";
import { NextApiRequest } from "next";

export const parseForm = async (
  req: NextApiRequest
): Promise<{ fields: Fields; files: Files }> => {
  return new Promise((resolve, reject) => {
    // 设置 multiples: false 表示只允许上传一个文件
    const form = formidable({ multiples: false });

    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
      }
      resolve({ fields, files });
    });
  });
};
