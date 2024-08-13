"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadFileToS3 } from "@/utils/s3Upload";
import axios from "axios";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { StartResponse, sendProcess } from "./process/sendProcess";
import { extractLastPart } from "@/utils/lastPart";

const getUrl = async () => {
  const response = await (await fetch(`/api/getExcelUrl`)).json();
  return response.url;
};

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [allProcessed, setAllProcessed] = useState<boolean>(false);
  const [jobStatus, setJobStatus] = useState<string | null>(null); // 新增状态

  const { data: url, isLoading } = useSWR(`/api/getExcelUrl`, () => getUrl(), {
    revalidateOnFocus: false,
  });

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

      sendProcess(key).then((data: StartResponse) => {
        const intervalId = setInterval(async () => {
          const response = await fetch(`/api/processStatus/${data.jobId}`);
          const status = await response.json();
          setJobStatus(status?.Status || null); // 更新状态

          if (status?.Status === "Success") {
            clearInterval(intervalId); // 停止轮询
            setAllProcessed(true);
          }
        }, 30000); // 每30秒检查一次
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
            {downloadUrl && !allProcessed ? "上传中..." : "上传"}
          </Button>
        </div>
        {downloadUrl && (
          <div className="mt-2">
            {jobStatus && <p>处理状态：{jobStatus}</p>}
            {jobStatus === "Success" && ( // 只有状态是 Success 才显示链接
              <Button variant="link">
                <a href={downloadUrl} download="processed_excel.xlsx">
                  下载处理后的Excel
                </a>
              </Button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
