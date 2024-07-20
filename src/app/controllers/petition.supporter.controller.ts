import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as supporterFuncs from '../models/petition.supporter.model';
import { NotFoundError } from "../services/custom-errors/NotFoundError";
import { ForbiddenError } from "../services/custom-errors/ForbiddenError";
import { BadRequestError } from "../services/custom-errors/BadRequestError";


const getAllSupportersForPetition = async (req: Request, res: Response): Promise<void> => {
    try{
        // Your code goes here
        const id = Number(req.params.id);
        if (isNaN(id)) {
            throw new BadRequestError("Invalid petition id");
        }
        const result = await supporterFuncs.getSupporters(id);
        res.status(200).send(result);

        return;
    } catch (err) {
        if (err instanceof BadRequestError) {
            Logger.error(err);
            res.status(400).send(err.message);
            return;
        }
        if (err instanceof NotFoundError) {
            Logger.error(err);
            res.statusMessage = "Not Found";
            res.status(404).send();
            return;
        }
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const addSupporter = async (req: Request, res: Response): Promise<void> => {
    try{
        // Your code goes here
        const token = req.header("X-Authorization");
        if (token === undefined) {
            res.status(401).send();
            return;
        }
        const id = Number(req.params.id); // petition id
        if (isNaN(id)) {
            Logger.error("Invalid petition id");
            throw new BadRequestError("Invalid petition id");
        }
        const body = req.body;
        const result = await supporterFuncs.giveSupport(id, token, body);
        if (result === undefined) {
            res.status(404).send();
            return;
        }
        res.status(201).send(result);
    } catch (err) {
        if (err instanceof BadRequestError) {
            res.status(400).send(err.message);
            return;
        }
        else if (err instanceof NotFoundError) {
            res.status(404).send(err.message);
            return;
        }
        else if (err instanceof ForbiddenError) {
            res.statusMessage = "Forbidden";
            res.status(403).send();
            return;
        }
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

export {getAllSupportersForPetition, addSupporter}
