"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { useState } from "react";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    setIsLoading(true);
    if (selectedFile) {
      const formData = new FormData();
      formData.append("excelFile", selectedFile);

      try {
        const response = await axios.post("/api/excel", formData, {
          responseType: "blob", // 接收blob数据
        });
        setDownloadUrl(URL.createObjectURL(response.data));
      } catch (error) {
        console.error("上传失败：", error);
        // 处理上传错误，例如显示错误信息给用户
      } finally {
        setIsLoading(false);
      }
    }
  };
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className={""}>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="picture">Excel File:</Label>
          <Input type="file" onChange={handleFileChange} accept=".xlsx, .xls" />
        </div>
        <div className="mt-2">
          <Button onClick={handleUpload} disabled={!selectedFile || isLoading}>
            {isLoading ? "上传中..." : "上传"}
          </Button>
        </div>

        {downloadUrl && (
          <a href={downloadUrl} download="processed_excel.xlsx">
            下载处理后的Excel
          </a>
        )}
      </div>
    </main>
  );
}
