import { Suspense } from "react";
import WorksiteManagementClient from "./worksite-management-client";

export default function WorksiteManagementPage() {
  return (
    <Suspense fallback={null}>
      <WorksiteManagementClient />
    </Suspense>
  );
}
