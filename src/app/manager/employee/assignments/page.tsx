import { Suspense } from "react";
import AssignmentManagementClient from "./assignment-management-client";

export default function AssignmentManagementPage() {
  return (
    <Suspense fallback={null}>
      <AssignmentManagementClient />
    </Suspense>
  );
}
