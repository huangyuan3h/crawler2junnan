"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadFileToS3 } from "@/utils/s3Upload";
import axios from "axios";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { sendProcess } from "./process/sendProcess";
import { extractLastPart } from "@/utils/lastPart";

const getUrl = async () => {
  const response = await (await fetch(`/api/getExcelUrl`)).json();
  return response.url;
};

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const { data: url, isLoading } = useSWR(`/api/getExcelUrl`, () => getUrl(), {
    revalidateOnFocus: false,
  });

  useEffect(() => {
    console.log(url);
  }, [url]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (selectedFile && url) {
      const download: string = (await uploadFileToS3(
        url,
        selectedFile
      )) as string;

      setDownloadUrl(download);

      const key = extractLastPart(download);

      sendProcess(key).then((data) => {
        console.log(data);
      });
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
            过一会，下载处理后的Excel
          </a>
        )}
      </div>
    </main>
  );
}
