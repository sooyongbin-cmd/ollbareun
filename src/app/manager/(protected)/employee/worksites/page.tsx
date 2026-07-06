import { Suspense } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";
import WorksiteManagementClient from "./worksite-management-client";

export default function WorksiteManagementPage() {
  return (
    <Suspense fallback={<ManagerLoadingMessage />}>
      <WorksiteManagementClient />
    </Suspense>
  );
}
