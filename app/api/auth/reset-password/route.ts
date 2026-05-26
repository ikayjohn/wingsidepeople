import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { hashToken } from "@/lib/internal-auth"

const schema = z.object({
  token: z.string().min(20),
  password: z.string().min(8),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { token, password } = schema.parse(body)

    const hashedToken = hashToken(token)
    const reset = await prisma.verificationToken.findUnique({
      where: { token: hashedToken },
    })

    if (!reset || reset.expires <= new Date() || !reset.identifier.startsWith("password-reset:")) {
      return NextResponse.json({ error: "Invalid or expired reset token." }, { status: 400 })
    }

    const email = reset.identifier.replace("password-reset:", "")
    const passwordHash = await bcrypt.hash(password, 12)

    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { password: passwordHash },
      }),
      prisma.verificationToken.deleteMany({
        where: { identifier: reset.identifier },
      }),
    ])

    return NextResponse.json({ message: "Password reset successful." })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Unable to reset password." }, { status: 500 })
  }
}

