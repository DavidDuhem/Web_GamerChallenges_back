import nodemailer from "nodemailer"

interface SendEmailOptions {
  to: string
  subject: string
  text?: string
  html?: string
  from?: string
}

async function sendEmail({
  to,
  subject,
  text,
  html,
  from = `"Gamer Challenges" <no-reply@gamerchallenges.com>`,
}: SendEmailOptions) {
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: false,
  })

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  })
}

export async function sendEmailForgotPassword({
  userEmail,
  token,
}: {
  userEmail: string
  token: string
}) {
  try {
    await sendEmail({
      to: userEmail,
      subject: "Réinitialisation de votre mot de passe",
      html: `
      <h1>Réinitialisation de votre mot de passe</h1>
      <p>Cliquez sur ce lien pour réinitialiser votre mot de passe :</p>
      <a href="${process.env.MAIL_RESET_LINK}/reset-password?token=${token}">${process.env.MAIL_RESET_LINK}/reset-password?token=${token}</a>
      <p>Ce lien expirera dans 15 minutes.</p>
    `,
    })
  } catch (error) {
    console.error("Erreur en envoyant le mail :", error)
  }
}
