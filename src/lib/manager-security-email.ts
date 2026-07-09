import nodemailer from "nodemailer";
import { getSystemConfigContent } from "./system-configs";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendAdminPreRegistrationEmail(newAdminEmail: string) {
  const recipient = await getSystemConfigContent("manager_email").catch(() => null);
  if (!recipient || !recipient.trim()) {
    console.warn("manager_email 설정이 비어있어 이메일을 발송하지 못했습니다.");
    return;
  }

  const subject = "[보안알림] 신규 관리자 사전 등록";
  const escapedEmail = escapeHtml(newAdminEmail);
  const html = `
    <h2>신규 관리자 사전 등록 알림</h2>
    <p>시스템에 새로운 관리자 이메일이 사전 등록되었습니다.</p>
    <ul>
      <li><strong>등록된 이메일:</strong> ${escapedEmail}</li>
      <li><strong>등록 일시:</strong> ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</li>
    </ul>
    <p>사전 등록된 관리자는 Google OAuth 로그인 시 자동으로 활성화됩니다.</p>
  `;

  await sendEmail(recipient.trim(), subject, html);
}

export async function sendAdminActivationEmail(activeAdminEmail: string) {
  const recipient = await getSystemConfigContent("manager_email").catch(() => null);
  if (!recipient || !recipient.trim()) {
    console.warn("manager_email 설정이 비어있어 이메일을 발송하지 못했습니다.");
    return;
  }

  const subject = "[보안알림] 관리자 계정 활성화 완료";
  const escapedEmail = escapeHtml(activeAdminEmail);
  const html = `
    <h2>관리자 계정 활성화 완료</h2>
    <p>사전 등록된 관리자 계정이 최초 Google 로그인을 통해 성공적으로 활성화되었습니다.</p>
    <ul>
      <li><strong>활성화된 이메일:</strong> ${escapedEmail}</li>
      <li><strong>활성화 일시:</strong> ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</li>
    </ul>
  `;

  await sendEmail(recipient.trim(), subject, html);
}

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const naverUser = process.env.NAVER_SMTP_USER;
  const naverPassword = process.env.NAVER_SMTP_PASSWORD;

  if (naverUser && naverPassword) {
    const rawPort = process.env.NAVER_SMTP_PORT;
    const port = rawPort ? Number(rawPort) : 465;
    const transporter = nodemailer.createTransport({
      host: "smtp.naver.com",
      port,
      secure: port === 465,
      auth: {
        user: naverUser,
        pass: naverPassword,
      },
    });

    await transporter.sendMail({
      from: process.env.NAVER_SMTP_FROM || naverUser,
      to,
      subject,
      html,
    });
  } else if (apiKey && from) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const message =
        payload && typeof payload === "object" && "message" in payload
          ? String(payload.message)
          : "이메일 발송에 실패했습니다.";
      throw new Error(message);
    }
  } else {
    throw new Error("메일 발송을 위한 환경변수가 설정되지 않았습니다. (Resend or NAVER SMTP)");
  }
}
