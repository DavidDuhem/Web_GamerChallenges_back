import assert from "node:assert"
import argon2 from "argon2"
import jwt, { JwtPayload } from "jsonwebtoken"
import { beforeEach, describe, it } from "node:test"
import { prisma } from "../../../prisma/index.js"
import axios from "axios"
import { User } from "@prisma/client"
import { generateAuthenticationTokens } from "../../utils/tokens.js"

describe("[POST] /auth/register", () => {
  const USER = {
    pseudo: "JohnDoe",
    email: `john@doe.io`,
    password: "P4$$w0rdtest",
    role: "",
    confirm: "P4$$w0rdtest",
    avatar: "",
  }

  it("should register a new user in the database", async () => {
    await axios.post("http://localhost:7357/api/auth/register", USER)

    const dbUser = await prisma.user.findFirstOrThrow({
      where: { email: USER.email },
    })

    assert.ok(dbUser.user_id)
    assert.strictEqual(dbUser.pseudo, USER.pseudo)
    assert.strictEqual(dbUser.email, USER.email)
    assert.match(dbUser.password, /\$argon2id/)
  })

  it("should return the created user with the right properties", async () => {
    const httpResponse = await axios.post(
      "http://localhost:7357/api/auth/register",
      USER
    )
    const returnedUser = httpResponse.data.user

    assert.strictEqual(httpResponse.status, 201)

    assert.ok(returnedUser.id)
    assert.strictEqual(returnedUser.pseudo, USER.pseudo)
    assert.strictEqual(returnedUser.email, USER.email)
    assert.strictEqual(returnedUser.role, "member")
  })
})

describe("[POST] /auth/login", () => {
  const EMAIL = "john@doe.io"
  const PASSWORD = "P4$$w0rdtest"
  let user: User

  beforeEach(async () => {
    user = await prisma.user.create({
      data: {
        pseudo: "John",
        email: EMAIL,
        password: await argon2.hash(PASSWORD),
        avatar: "",
      },
    })
  })

  it("should generate a JWT when the user authenticate correctly", async () => {
    const credentials = { email: EMAIL, password: PASSWORD }

    const httpResponse = await axios.post(
      "http://localhost:7357/api/auth/login",
      credentials
    )
    const accessToken = httpResponse.data.accessToken

    assert.strictEqual(httpResponse.status, 200)
    assert.match(
      accessToken.token,
      /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/
    )
  })

  it("should generate a refresh token when the user authenticate correctly", async () => {
    const credentials = { email: EMAIL, password: PASSWORD }

    const httpResponse = await axios.post(
      "http://localhost:7357/api/auth/login",
      credentials
    )
    const resData = httpResponse.data

    assert.strictEqual(httpResponse.status, 200)
    const setCookie = httpResponse.headers["set-cookie"]
    assert.ok(setCookie && setCookie.length > 0)
    assert.ok(
      setCookie.some((cookie: string) => cookie.startsWith("refreshToken="))
    )
  })

  it("should generate a JWT with useful information about the user", async () => {
    const credentials = { email: EMAIL, password: PASSWORD }

    const httpResponse = await axios.post(
      "http://localhost:7357/api/auth/login",
      credentials
    )
    const resData = httpResponse.data

    const token = resData.accessToken.token
    const payload = jwt.decode(token) as JwtPayload
    assert.strictEqual(payload.id, user.user_id)
    assert.strictEqual(payload.role, user.role)
  })
})

describe("[POST] /auth/logout", () => {
  it("should return a 204 status and new cookies to unset existing ones", async () => {
    it.mock.method(Math, "random", () => "FAKE")

    const httpResponse = await fetch("http://localhost:7357/api/auth/logout", {
      method: "POST",
    })

    assert.strictEqual(httpResponse.status, 204)
    assert.match(httpResponse.headers.get("set-cookie")!, /accessToken=/)
    assert.match(httpResponse.headers.get("set-cookie")!, /refreshToken=/)
  })
})
