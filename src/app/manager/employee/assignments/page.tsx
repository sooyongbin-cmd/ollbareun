import { Suspense } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";
import AssignmentManagementClient from "./assignment-management-client";

export default function AssignmentManagementPage() {
  return (
    <Suspense fallback={<ManagerLoadingMessage />}>
      <AssignmentManagementClient />
    </Suspense>
  );
}
