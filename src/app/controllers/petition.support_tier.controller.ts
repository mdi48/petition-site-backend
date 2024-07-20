import {Request, Response} from "express";
import Logger from "../../config/logger";
import { NotFoundError } from "../services/custom-errors/NotFoundError";
import { ForbiddenError } from "../services/custom-errors/ForbiddenError";
import { BadRequestError } from "../services/custom-errors/BadRequestError";
import { InvalidGivenError } from "../services/custom-errors/InvalidGivenError";
import * as supportTierFuncs from "../models/petition.support_tier.model";

const addSupportTier = async (req: Request, res: Response): Promise<void> => {
    // uses PUT to add a support tier to a petition, thus updating the petition's information
    try{
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).send();
            return;
        }
        const token = req.header("X-Authorization");
        if (token === undefined) {
            res.status(401).send();
            return;
        }
        const result = await supportTierFuncs.addSupportTier(id, token, req.body);
        if (result === undefined) {
            res.status(404).send();
            return;
        }
        res.status(201).send(result);
    } catch (err) {
        if (err instanceof BadRequestError) {
            Logger.error(err);
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }
        if (err instanceof InvalidGivenError) {
            Logger.error(err);
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        if (err instanceof ForbiddenError) {
            Logger.error(err);
            res.statusMessage = "Forbidden";
            res.status(403).send();
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

const editSupportTier = async (req: Request, res: Response): Promise<void> => {
    // uses PATCH to edit an existing support tier for a petition, but does not require sending the entire body with the request
    // i.e. can send across only the fields that you want to update (provided they are still valid)
    try{
        // Your code goes here
        const token = req.header("X-Authorization");
        if (token === undefined) {
            res.status(401).send();
            return;
        }
        const petitionId = Number(req.params.id);
        if (isNaN(petitionId)) {
            res.status(400).send();
            return;
        }

        const tierId = Number(req.params.tierId);
        if (isNaN(tierId)) {
            res.status(400).send();
            return;
        }

        const result = await supportTierFuncs.editSupportTier(petitionId, token, tierId, req.body);
        if (result === undefined) {
            res.status(404).send();
            return;
        }
        res.status(200).send(result);
        return;
    } catch (err) {
        if (err instanceof BadRequestError) {
            Logger.error(err);
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }
        if (err instanceof InvalidGivenError) {
            Logger.error(err);
            res.statusMessage = "Invalid information given";
            res.status(401).send();
            return;
        }
        if (err instanceof ForbiddenError) {
            Logger.error(err);
            res.statusMessage = "Forbidden";
            res.status(403).send();
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

const deleteSupportTier = async (req: Request, res: Response): Promise<void> => {
    try{
        const token = req.header("X-Authorization");
        if (token === undefined) {
            res.status(401).send();
            return;
        }

        const petitionId = Number(req.params.id);
        if (isNaN(petitionId)) {
            res.status(400).send();
            return;
        }

        const tierId = Number(req.params.tierId);
        if (isNaN(tierId)) {
            res.status(400).send();
            return;
        }

        const result = await supportTierFuncs.deleteSupportTier(petitionId, token, tierId);

        if (result === undefined) {
            res.status(404).send();
            return;
        }
        res.status(200).send();
        return;

    } catch (err) {
        if (err instanceof BadRequestError) {
            Logger.error(err);
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        } if (err instanceof InvalidGivenError) {
            Logger.error(err);
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        } if (err instanceof ForbiddenError) {
            Logger.error(err);
            res.statusMessage = "Forbidden";
            res.status(403).send();
            return;
        } if (err instanceof NotFoundError) {
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

export {addSupportTier, editSupportTier, deleteSupportTier};
