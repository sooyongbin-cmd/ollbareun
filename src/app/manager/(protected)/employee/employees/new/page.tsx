"use client";

import { useRouter } from "next/navigation";
import EmployeeRegistrationForm from "../employee-registration-form";

export default function EmployeeNewPage() {
  const router = useRouter();
  return <EmployeeRegistrationForm onClose={() => router.push("/manager/employee/employees")} />;
}
