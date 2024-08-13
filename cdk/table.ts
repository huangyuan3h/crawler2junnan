import { Table, Stack } from "sst/constructs";

export const getTableConfig = (stack: Stack) => {
  const JobStatusTable = new Table(stack, "JobStatusTable", {
    fields: {
      JobId: "string",
    },
    primaryIndex: { partitionKey: "JobId" },
  });

  return { JobStatusTable };
};
