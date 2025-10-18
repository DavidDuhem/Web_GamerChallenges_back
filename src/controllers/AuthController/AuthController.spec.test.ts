import assert from "node:assert"
import argon2 from "argon2"
import jwt, { JwtPayload } from "jsonwebtoken"
import { beforeEach, describe, it } from "node:test"
import { prisma } from "../../../prisma/index.js"
import axios from "axios"
import { User } from "@prisma/client"

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
    const httpResponse = await axios.post(
      "http://localhost:7357/api/auth/logout"
    )

    const setCookie = httpResponse.headers["set-cookie"]

    if (!setCookie) {
      throw new Error("Aucun cookie reçu dans la réponse")
    }

    const cookieHeader = Array.isArray(setCookie)
      ? setCookie.join(", ")
      : setCookie

    assert.strictEqual(httpResponse.status, 204)
    assert.match(cookieHeader, /accessToken=;/)
    assert.match(cookieHeader, /Expires=Thu, 01 Jan 1970 00:00:00 GMT/)
    assert.match(cookieHeader, /refreshToken=;/)
  })
})

describe("[POST] /auth/refresh", () => {
  it("should return a new access token an refresh token", async () => {
    // ARRANGE
    const user = await prisma.user.create({
      data: {
        pseudo: "JohnDoe",
        email: `john2@doe.io`,
        password: "password",
        role: "member",
        avatar: "",
      },
    })

    await prisma.token.create({
      data: {
        token: "12345",
        user_id: user.user_id,
        token_type: "refresh",
        expires_at: new Date("2080/01/01"),
      },
    })

    // ACT
    const httpResponse = await axios.post(
      "http://localhost:7357/api/auth/refresh",
      {},
      {
        headers: {
          Cookie: "refreshToken=12345",
        },
      }
    )

    const setCookie = httpResponse.headers["set-cookie"]

    if (!setCookie) {
      throw new Error("Aucun cookie reçu dans la réponse")
    }

    const cookieHeader = Array.isArray(setCookie)
      ? setCookie.join(", ")
      : setCookie

    // ASSERT
    assert.strictEqual(httpResponse.status, 200)
    assert.match(cookieHeader, /accessToken=/)
  })

  it("should return 401 when the access token is not valid", async () => {
    const user = await prisma.user.create({
      data: {
        pseudo: "JohnDoe",
        email: `john2@doe.io`,
        password: "password",
        role: "member",
        avatar: "",
      },
    })

    await prisma.token.create({
      data: {
        token: "12345",
        user_id: user.user_id,
        token_type: "refresh",
        expires_at: new Date("1990/01/01"),
      },
    })

    try {
      const httpResponse = await axios.post(
        "http://localhost:7357/api/auth/refresh",
        {},
        {
          headers: {
            Cookie: "refreshToken=12345",
          },
        }
      )
      assert.fail("Request should have failed with error 401")
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        assert.strictEqual(error.response.status, 401)
      } else {
        throw error
      }
    }
  })
})
