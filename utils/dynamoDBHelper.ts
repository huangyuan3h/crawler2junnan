import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";

const dynamoDB = new DynamoDB({});

const tableName = "dev-crawl-by-excel-JobStatusTable";

interface JobStatus {
  JobId: string;
  Status: string;
  StartTime: string;
  EndTime?: string;
}

// Insert a new job process record and return the jobId
export const insertJobProcess = async (): Promise<string> => {
  const jobId = uuidv4();
  const startTime = new Date().toISOString();

  const params = {
    TableName: tableName,
    Item: {
      JobId: { S: jobId },
      Status: { S: "Running" },
      StartTime: { S: startTime },
    },
  };

  await dynamoDB.putItem(params);
  return jobId;
};

// Update job status (internal method)
export const updateJobStatus = async (jobId: string, status: string) => {
  const endTime = new Date().toISOString();

  const params = {
    TableName: tableName,
    Key: {
      JobId: { S: jobId },
    },
    UpdateExpression: "SET #status = :status, EndTime = :endTime",
    ExpressionAttributeNames: {
      "#status": "Status",
    },
    ExpressionAttributeValues: {
      ":status": { S: status },
      ":endTime": { S: endTime },
    },
  };

  await dynamoDB.updateItem(params);
};

// Mark job as successful
export const markJobAsSuccess = async (jobId: string) => {
  await updateJobStatus(jobId, "Success");
};

// Mark job as failed
export const markJobAsFailed = async (jobId: string) => {
  await updateJobStatus(jobId, "Failed");
};

// Get job status by jobId
export const getJobStatus = async (
  jobId: string
): Promise<JobStatus | null> => {
  const params = {
    TableName: tableName,
    Key: {
      JobId: { S: jobId },
    },
  };

  try {
    const data = await dynamoDB.getItem(params);
    if (data.Item) {
      return {
        JobId: data.Item.JobId.S || "",
        Status: data.Item.Status.S || "",
        StartTime: data.Item.StartTime.S || "",
        EndTime: data.Item.EndTime?.S,
      };
    } else {
      return null; // Job not found
    }
  } catch (error) {
    console.error("Error fetching job status:", error);
    throw error; // Consider handling the error differently based on your needs
  }
};
