"use client";

import QRCode from "qrcode";
import type { InspectionQrPayload } from "@/lib/inspection";

type SaveFilePickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<{
    createWritable: () => Promise<{
      write: (data: Blob) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("QR 이미지를 생성하지 못했습니다."));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("QR 파일을 생성하지 못했습니다."));
      }
    }, "image/png");
  });
}

export async function saveInspectionQrImage(input: {
  payload: InspectionQrPayload;
  worksiteName: string;
  fileName: string;
}) {
  const qrDataUrl = await QRCode.toDataURL(JSON.stringify(input.payload), {
    margin: 1,
    width: 320,
  });
  const qrImage = await loadImage(qrDataUrl);
  const canvas = document.createElement("canvas");
  const width = 420;
  const titleHeight = 84;
  canvas.width = width;
  canvas.height = titleHeight + 340;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("QR 이미지를 생성하지 못했습니다.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#111111";
  context.font = "700 28px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(input.worksiteName, width / 2, 42);
  context.drawImage(qrImage, 50, titleHeight, 320, 320);

  const blob = await canvasToBlob(canvas);
  const fileName = input.fileName.endsWith(".png") ? input.fileName : `${input.fileName}.png`;
  const pickerWindow = window as SaveFilePickerWindow;

  if (pickerWindow.showSaveFilePicker) {
    const handle = await pickerWindow.showSaveFilePicker({
      suggestedName: fileName,
      types: [
        {
          description: "PNG Image",
          accept: { "image/png": [".png"] },
        },
      ],
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
