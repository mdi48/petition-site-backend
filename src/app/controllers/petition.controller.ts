import {Request, Response} from "express";
import Logger from '../../config/logger';
import { InvalidGivenError } from '../services/custom-errors/InvalidGivenError';
import { ForbiddenError } from '../services/custom-errors/ForbiddenError';
import { NotFoundError } from '../services/custom-errors/NotFoundError';
import { BadRequestError } from "../services/custom-errors/BadRequestError";
import * as passwords from '../services/passwords';
import * as petitionFuncs from '../models/petition.model';

const getAllPetitions = async (req: Request, res: Response): Promise<void> => {
    try{

        if (req.query.startIndex && isNaN(Number(req.query.startIndex)) || (req.query.count && isNaN(Number(req.query.count)))) {
            throw new InvalidGivenError("Invalid data given: startIndex and count must be numbers");
            return;
        }

        if ((req.query.startIndex && Number(req.query.startIndex) < 0) || (req.query.count && Number(req.query.count) < 0)) {
            throw new InvalidGivenError("Invalid data given: startIndex and count must be >= 0");
            return;
        }

        const result = await petitionFuncs.getPetitions(req.query);
        res.status(200).send({count: result.count, petitions: result.petitions});
        return;
    } catch (err) {
        if (err instanceof InvalidGivenError) {
            Logger.error(err);
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
};



const getPetition = async (req: Request, res: Response): Promise<void> => { // Completely done
    try{
        // Your code goes here
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).send("Id is not a number");
            return;
        }
        const result = await petitionFuncs.getPetitionById(id);
        if (result === undefined) {
            res.status(404).send("Not Found");
        } else {
            res.status(200).send(result);
            return;
        }

    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
};

const addPetition = async (req: Request, res: Response): Promise<any> => {
    try {
        // Your code goes here
        const token = req.header('X-Authorization');  // auth_token is required for this (I think)
        if (token === undefined) {
            res.status(401).send();
            return;
        }
        // petition must consist of title, description, categoryId, supportTiers[]
        // categoryId must be existent or else give a 400
        // petition must have between 1 and 3 supportTiers (inclusive) or else give a 400
        // title must be unique or else give a 403
        // each supportTier.title must be unique within the petition or else give a 400
        const title = req.body.title;
        const description = req.body.description;
        const categoryId = req.body.categoryId;
        const supportTiers = req.body.supportTiers;
        if (title === undefined || title === "" || description === undefined || categoryId === undefined || supportTiers === undefined) {
            res.status(400).send();
            return;
        }

        if (supportTiers.length < 1 || supportTiers.length > 3) {
            res.status(400).send();
            return;
        }

        for (const element of supportTiers) {
            if (element.title === undefined || element.title === "") {
                res.status(400).send();
                return;
            }
        }

        const result = await petitionFuncs.postPetition(token, title, description, categoryId, supportTiers);


        res.status(201).send({petitionId: result});
        return;


    } catch (err) {
        if (err instanceof InvalidGivenError) {
            Logger.error(err);
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }
        if (err instanceof ForbiddenError) {
            res.statusMessage = "Forbidden";
            res.status(403).send();
            return;
        } else {
            Logger.error(err);
            res.statusMessage = "Internal Server Error";
            res.status(500).send();
            return;
        }
    }
};

const editPetition = async (req: Request, res: Response): Promise<void> => {
    try{
        // Updates the title, description, and cost (not necessarily all of them at once)
        // Must be the owner of the petition to do this
        const token = req.header('X-Authorization');
        if (token === undefined) {
            res.status(401).send();
            return;
        }
        const id = Number(req.params.id);
        if (id === undefined) {
            res.status(400).send();
            return;
        }
        if (req.body.title === undefined && req.body.description === undefined && req.body.categoryId === undefined) {
            res.status(400).send();
            return;
        }

        const result = await petitionFuncs.makeChanges(id, req.body, token);
        if (result === undefined) {
            res.status(404).send();
            return;
        }

        res.status(200).send();

        return;
    } catch (err) {
        if (err instanceof InvalidGivenError) {
            Logger.error(err);
            res.statusMessage = "Invalid data given";
            res.status(400).send();
            return;
        } else if (err instanceof ForbiddenError) {
            res.statusMessage = "User does not have permission to edit this petition";
            res.status(403).send();
            return;
        }
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const deletePetition = async (req: Request, res: Response): Promise<void> => {
    try{
        // Your code goes here
        const token = req.header('X-Authorization');
        if (token === undefined) {
            res.status(401).send("Unauthorized");
            return;
        }
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).send("Id is not a number");
            return;
        }

        const result = await petitionFuncs.deletingPetition(id, token);
        if (result === undefined) {
            res.status(404).send();
            return;
        }
        res.status(200).send(); // Apparently according to Mozilla docs, 204 is the correct status code for a successful deletion
        return;
    } catch (err) {
        if (err instanceof ForbiddenError) {
            res.statusMessage = "User does not have permission to delete this petition";
            res.status(403).send();
            return;
        }
        if (err instanceof NotFoundError) {
            res.statusMessage = "Not Found";
            res.status(404).send();
            return;
        }
        if (err instanceof InvalidGivenError) {
            res.statusMessage = "Invalid data given";
            res.status(400).send();
            return;
        }
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const getCategories = async(req: Request, res: Response): Promise<void> => { // Completely done
    try{
        // Your code goes here
        const result = await petitionFuncs.getCategories();
        res.status(200).send(result);
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

export {getAllPetitions, getPetition, addPetition, editPetition, deletePetition, getCategories};
