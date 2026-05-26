import nodemailer from "nodemailer"

function getSmtpConfig() {
  const host = process.env.EMAIL_SERVER_HOST
  const port = process.env.EMAIL_SERVER_PORT
  const user = process.env.EMAIL_SERVER_USER
  const pass = process.env.EMAIL_SERVER_PASSWORD
  const from = process.env.EMAIL_FROM

  if (!host || !port || !user || !pass || !from) {
    return null
  }

  return {
    host,
    port: Number(port),
    user,
    pass,
    from,
  }
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const config = getSmtpConfig()
  if (!config) {
    return { sent: false as const, reason: "missing_email_config" as const }
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  })

  await transporter.sendMail({
    from: config.from,
    to: email,
    subject: "Reset your Wingside portal password",
    text: `Use this link to reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
    html: `
      <p>Use the link below to reset your Wingside portal password:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link expires in 1 hour.</p>
    `,
  })

  return { sent: true as const }
}

