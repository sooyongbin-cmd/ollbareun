"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type WorksiteResponse = {
  worksite: {
    id: string;
    name: string;
  };
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "요청을 처리하지 못했습니다.");
  }

  return payload as T;
}

export default function WorksiteNewPage() {
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      await postJson<WorksiteResponse>("/api/worksites", {
        name: data.get("name"),
        latitude: data.get("latitude"),
        longitude: data.get("longitude"),
        radiusMeters: data.get("radiusMeters"),
      });

      window.alert("자료를 저장하였습니다.");
      router.push("/manager/employee/worksites");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "요청을 처리하지 못했습니다.");
    }
  }

  return (
    <section className="space-y-[24px]">
      <header>
        <h1 className="text-[40px] font-semibold tracking-tight leading-[1.1]">근무지등록</h1>
        <p className="text-[21px] font-normal text-ink-muted-48 mt-2 max-w-[600px]">
          근무지명, GPS 좌표, 허용 반경을 입력해 근무지를 등록합니다.
        </p>
      </header>

      <section className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="worksite-name">
                근무지명
              </label>
              <input className="field" id="worksite-name" name="name" placeholder="작업장 이름을 입력하세요." required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="worksite-latitude">
                  위도
                </label>
                <input className="field" id="worksite-latitude" name="latitude" placeholder="37.123456" required />
              </div>
              <div className="space-y-2">
                <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="worksite-longitude">
                  경도
                </label>
                <input className="field" id="worksite-longitude" name="longitude" placeholder="127.123456" required />
              </div>
              <div className="space-y-2">
                <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="worksite-radius">
                  허용반경(m)
                </label>
                <input className="field" id="worksite-radius" name="radiusMeters" placeholder="100" required />
              </div>
            </div>
          </div>

          <button className="button-primary w-full md:w-auto" data-testid="worksite-submit" type="submit">
            근무지 등록
          </button>
        </form>

        {error ? <p className="status-warn mt-6 text-center">{error}</p> : null}
      </section>
    </section>
  );
}
