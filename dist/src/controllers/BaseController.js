/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../../prisma/index.js";
export default class BaseController {
    prismaClient = prisma;
    model;
    primaryKey;
    constructor(model, primaryKey) {
        this.model = model;
        this.primaryKey = primaryKey;
    }
    async findAll() {
        return this.model.findMany();
    }
    async findById(id) {
        return this.model.findUnique({ where: { [this.primaryKey]: id } });
    }
    async create(data) {
        return this.model.create({ data: data });
    }
    async update(id, data) {
        return this.model.update({ where: { [this.primaryKey]: id }, data });
    }
    async delete(id) {
        return this.model.delete({ where: { [this.primaryKey]: id } });
    }
}
