import axios from "axios";
import { generateAuthenticationTokens } from "../utils/tokens.js";
export const apiBaseUrl = `http://localhost:7357/api`;
export const authedRequester = buildAuthedRequester(buildFakeUser());
export function buildAuthedRequester(user) {
    const { accessToken } = generateAuthenticationTokens(user);
    return axios.create({
        baseURL: apiBaseUrl,
        headers: {
            Authorization: `Bearer ${accessToken.token}`,
        },
        validateStatus: () => true,
    });
}
export function buildFakeUser(user) {
    return {
        user_id: 1000000,
        pseudo: "pseudo",
        email: `user${Math.random()}${Date.now()}@oclock.io`,
        password: "P4$$w0rd",
        avatar: "",
        role: "member",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        ...user,
    };
}
